import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Scenario, ScenarioChapter, AutoSaveState } from '@/types'
import { supabase } from '@/lib/supabase'
import { debounce } from 'lodash'
import { measureAsyncOperation, PerformanceMonitor } from '@/lib/performance'

interface OptimizedScenarioState {
  // Core state (optimized selectors)
  scenarios: Map<string, Scenario>
  chapters: Map<string, ScenarioChapter>
  chaptersByScenario: Map<string, string[]>
  
  // Current context
  currentScenarioId: string | null
  currentChapterId: string | null
  
  // Auto-save state
  autoSaveStates: Map<string, AutoSaveState>
  
  // Performance tracking
  loadingStates: Map<string, boolean>
  errorStates: Map<string, string | null>
  
  // Selectors (memoized)
  getCurrentScenario: () => Scenario | null
  getCurrentChapter: () => ScenarioChapter | null
  getScenarioChapters: (scenarioId: string) => ScenarioChapter[]
  getAutoSaveState: (scenarioId: string) => AutoSaveState
  
  // Optimized actions
  loadScenario: (scenarioId: string) => Promise<void>
  updateScenarioContent: (scenarioId: string, content: any) => void
  updateChapterContent: (chapterId: string, content: any) => void
  saveScenario: (scenarioId: string) => Promise<void>
  
  // Chapter management
  createChapter: (scenarioId: string, title: string, parentId?: string) => Promise<ScenarioChapter>
  updateChapter: (chapterId: string, updates: Partial<ScenarioChapter>) => Promise<void>
  deleteChapter: (chapterId: string) => Promise<void>
  reorderChapters: (scenarioId: string, chapters: ScenarioChapter[]) => Promise<void>
  
  // Context management
  setCurrentScenario: (scenarioId: string | null) => void
  setCurrentChapter: (chapterId: string | null) => void
  
  // Batch operations for performance
  batchUpdateChapters: (updates: Array<{ id: string; updates: Partial<ScenarioChapter> }>) => Promise<void>
  
  // Memory management
  clearUnusedData: () => void
  preloadScenario: (scenarioId: string) => Promise<void>
}

const defaultAutoSaveState: AutoSaveState = {
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
  error: null,
}

// Debounced auto-save functions
const debouncedSaveOperations = new Map<string, ReturnType<typeof debounce>>()

export const useOptimizedScenarioStore = create<OptimizedScenarioState>()(
  subscribeWithSelector(
    (set, get) => ({
      // Initial state
      scenarios: new Map(),
      chapters: new Map(),
      chaptersByScenario: new Map(),
      currentScenarioId: null,
      currentChapterId: null,
      autoSaveStates: new Map(),
      loadingStates: new Map(),
      errorStates: new Map(),

      // Memoized selectors
      getCurrentScenario: () => {
        const { scenarios, currentScenarioId } = get()
        return currentScenarioId ? scenarios.get(currentScenarioId) || null : null
      },

      getCurrentChapter: () => {
        const { chapters, currentChapterId } = get()
        return currentChapterId ? chapters.get(currentChapterId) || null : null
      },

      getScenarioChapters: (scenarioId: string) => {
        const { chapters, chaptersByScenario } = get()
        const chapterIds = chaptersByScenario.get(scenarioId) || []
        return chapterIds
          .map(id => chapters.get(id))
          .filter((chapter): chapter is ScenarioChapter => chapter !== undefined)
          .sort((a, b) => a.orderIndex - b.orderIndex)
      },

      getAutoSaveState: (scenarioId: string) => {
        const { autoSaveStates } = get()
        return autoSaveStates.get(scenarioId) || defaultAutoSaveState
      },

      loadScenario: async (scenarioId: string) => {
        const { scenarios, loadingStates, errorStates } = get()
        
        // Check if already loaded
        if (scenarios.has(scenarioId)) {
          set({ currentScenarioId: scenarioId })
          return
        }

        // Set loading state
        set({
          loadingStates: new Map(loadingStates).set(scenarioId, true),
          errorStates: new Map(errorStates).set(scenarioId, null)
        })

        try {
          const result = await measureAsyncOperation(`load-scenario-${scenarioId}`, async () => {
            // Load scenario and chapters in parallel
            const [scenarioResponse, chaptersResponse] = await Promise.all([
              supabase
                .from('scenarios')
                .select('*')
                .eq('id', scenarioId)
                .single(),
              supabase
                .from('scenario_chapters')
                .select('*')
                .eq('scenario_id', scenarioId)
                .order('order_index', { ascending: true })
            ])

            if (scenarioResponse.error) throw scenarioResponse.error
            if (chaptersResponse.error) throw chaptersResponse.error

            return {
              scenario: scenarioResponse.data,
              chapters: chaptersResponse.data
            }
          })

          const { scenario: scenarioData, chapters: chaptersData } = result

          // Transform and store data
          const scenario: Scenario = {
            id: scenarioData.id,
            title: scenarioData.title,
            content: scenarioData.content,
            projectId: scenarioData.project_id,
            orderIndex: scenarioData.order_index,
            wordCount: scenarioData.word_count || 0,
            lastEditedAt: scenarioData.last_edited_at || scenarioData.updated_at,
            version: scenarioData.version || 1,
            createdAt: scenarioData.created_at,
            updatedAt: scenarioData.updated_at,
          }

          const chapters: ScenarioChapter[] = chaptersData.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            scenarioId: chapter.scenario_id,
            orderIndex: chapter.order_index,
            parentId: chapter.parent_id,
            createdAt: chapter.created_at,
            updatedAt: chapter.updated_at,
          }))

          // Update state efficiently
          const newScenarios = new Map(get().scenarios).set(scenarioId, scenario)
          const newChapters = new Map(get().chapters)
          const chapterIds: string[] = []

          chapters.forEach(chapter => {
            newChapters.set(chapter.id, chapter)
            chapterIds.push(chapter.id)
          })

          const newChaptersByScenario = new Map(get().chaptersByScenario).set(scenarioId, chapterIds)

          set({
            scenarios: newScenarios,
            chapters: newChapters,
            chaptersByScenario: newChaptersByScenario,
            currentScenarioId: scenarioId,
            currentChapterId: chapters[0]?.id || null,
            loadingStates: new Map(loadingStates).set(scenarioId, false),
          })

          // Set up auto-save for this scenario
          get().setupAutoSave(scenarioId)

        } catch (error) {
          set({
            loadingStates: new Map(loadingStates).set(scenarioId, false),
            errorStates: new Map(errorStates).set(scenarioId, (error as Error).message)
          })
        }
      },

      updateScenarioContent: (scenarioId: string, content: any) => {
        const { scenarios, autoSaveStates } = get()
        const scenario = scenarios.get(scenarioId)
        
        if (!scenario) return

        const wordCount = content ? JSON.stringify(content).length : 0
        const now = new Date().toISOString()
        
        const updatedScenario: Scenario = {
          ...scenario,
          content,
          wordCount,
          lastEditedAt: now,
        }

        // Update scenario
        const newScenarios = new Map(scenarios).set(scenarioId, updatedScenario)
        
        // Mark as having unsaved changes
        const currentAutoSave = autoSaveStates.get(scenarioId) || defaultAutoSaveState
        const newAutoSaveStates = new Map(autoSaveStates).set(scenarioId, {
          ...currentAutoSave,
          hasUnsavedChanges: true,
        })

        set({
          scenarios: newScenarios,
          autoSaveStates: newAutoSaveStates,
        })

        // Trigger debounced auto-save
        get().triggerAutoSave(scenarioId)
      },

      updateChapterContent: (chapterId: string, content: any) => {
        const { chapters } = get()
        const chapter = chapters.get(chapterId)
        
        if (!chapter) return

        const updatedChapter: ScenarioChapter = {
          ...chapter,
          content,
          updatedAt: new Date().toISOString(),
        }

        const newChapters = new Map(chapters).set(chapterId, updatedChapter)
        
        set({ chapters: newChapters })

        // Trigger auto-save for the scenario
        get().triggerAutoSave(chapter.scenarioId)
      },

      saveScenario: async (scenarioId: string) => {
        const { scenarios, chapters, chaptersByScenario, autoSaveStates } = get()
        const scenario = scenarios.get(scenarioId)
        const currentAutoSave = autoSaveStates.get(scenarioId) || defaultAutoSaveState
        
        if (!scenario || currentAutoSave.isSaving) return

        // Set saving state
        const newAutoSaveStates = new Map(autoSaveStates).set(scenarioId, {
          ...currentAutoSave,
          isSaving: true,
          error: null,
        })
        set({ autoSaveStates: newAutoSaveStates })

        try {
          await measureAsyncOperation(`save-scenario-${scenarioId}`, async () => {
            // Save scenario
            const { error: scenarioError } = await supabase
              .from('scenarios')
              .update({
                content: scenario.content,
                word_count: scenario.wordCount,
                last_edited_at: scenario.lastEditedAt,
                version: scenario.version + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', scenarioId)

            if (scenarioError) throw scenarioError

            // Save chapters in batch
            const chapterIds = chaptersByScenario.get(scenarioId) || []
            const chapterUpdates = chapterIds.map(id => chapters.get(id)).filter(Boolean)

            if (chapterUpdates.length > 0) {
              const { error: chaptersError } = await supabase
                .from('scenario_chapters')
                .upsert(
                  chapterUpdates.map(chapter => ({
                    id: chapter!.id,
                    title: chapter!.title,
                    content: chapter!.content,
                    scenario_id: chapter!.scenarioId,
                    order_index: chapter!.orderIndex,
                    parent_id: chapter!.parentId,
                    updated_at: new Date().toISOString(),
                  }))
                )

              if (chaptersError) throw chaptersError
            }
          })

          // Update success state
          const updatedScenario = {
            ...scenario,
            version: scenario.version + 1,
            updatedAt: new Date().toISOString(),
          }

          set({
            scenarios: new Map(scenarios).set(scenarioId, updatedScenario),
            autoSaveStates: new Map(autoSaveStates).set(scenarioId, {
              isSaving: false,
              lastSaved: new Date(),
              hasUnsavedChanges: false,
              error: null,
            })
          })

        } catch (error) {
          set({
            autoSaveStates: new Map(autoSaveStates).set(scenarioId, {
              ...currentAutoSave,
              isSaving: false,
              error: (error as Error).message,
            })
          })
        }
      },

      // Helper methods (not exposed in interface but used internally)
      setupAutoSave: (scenarioId: string) => {
        if (debouncedSaveOperations.has(scenarioId)) return

        const debouncedSave = debounce(() => {
          get().saveScenario(scenarioId)
        }, 3000)

        debouncedSaveOperations.set(scenarioId, debouncedSave)
      },

      triggerAutoSave: (scenarioId: string) => {
        const debouncedSave = debouncedSaveOperations.get(scenarioId)
        if (debouncedSave) {
          debouncedSave()
        }
      },

      createChapter: async (scenarioId: string, title: string, parentId?: string) => {
        const { chapters, chaptersByScenario } = get()
        const currentChapterIds = chaptersByScenario.get(scenarioId) || []
        const existingChapters = currentChapterIds.map(id => chapters.get(id)).filter(Boolean)
        const maxOrderIndex = Math.max(...existingChapters.map(c => c!.orderIndex), -1)

        const { data, error } = await supabase
          .from('scenario_chapters')
          .insert({
            title,
            scenario_id: scenarioId,
            order_index: maxOrderIndex + 1,
            parent_id: parentId || null,
            content: { type: 'doc', content: [] },
          })
          .select()
          .single()

        if (error) throw error

        const newChapter: ScenarioChapter = {
          id: data.id,
          title: data.title,
          content: data.content,
          scenarioId: data.scenario_id,
          orderIndex: data.order_index,
          parentId: data.parent_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }

        // Update state
        const newChapters = new Map(chapters).set(newChapter.id, newChapter)
        const newChapterIds = [...currentChapterIds, newChapter.id]
        const newChaptersByScenario = new Map(chaptersByScenario).set(scenarioId, newChapterIds)

        set({
          chapters: newChapters,
          chaptersByScenario: newChaptersByScenario,
        })

        return newChapter
      },

      updateChapter: async (chapterId: string, updates: Partial<ScenarioChapter>) => {
        const { chapters } = get()
        const chapter = chapters.get(chapterId)
        if (!chapter) throw new Error('Chapter not found')

        const { error } = await supabase
          .from('scenario_chapters')
          .update({
            title: updates.title,
            content: updates.content,
            order_index: updates.orderIndex,
            parent_id: updates.parentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', chapterId)

        if (error) throw error

        const updatedChapter = {
          ...chapter,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        set({
          chapters: new Map(chapters).set(chapterId, updatedChapter),
        })
      },

      deleteChapter: async (chapterId: string) => {
        const { chapters, chaptersByScenario } = get()
        const chapter = chapters.get(chapterId)
        if (!chapter) return

        const { error } = await supabase
          .from('scenario_chapters')
          .delete()
          .eq('id', chapterId)

        if (error) throw error

        // Update state
        const newChapters = new Map(chapters)
        newChapters.delete(chapterId)

        const currentChapterIds = chaptersByScenario.get(chapter.scenarioId) || []
        const newChapterIds = currentChapterIds.filter(id => id !== chapterId)
        const newChaptersByScenario = new Map(chaptersByScenario).set(chapter.scenarioId, newChapterIds)

        set({
          chapters: newChapters,
          chaptersByScenario: newChaptersByScenario,
          currentChapterId: get().currentChapterId === chapterId ? newChapterIds[0] || null : get().currentChapterId,
        })
      },

      reorderChapters: async (scenarioId: string, reorderedChapters: ScenarioChapter[]) => {
        const { chapters, chaptersByScenario } = get()

        // Update order indices
        const updatedChapters = reorderedChapters.map((chapter, index) => ({
          ...chapter,
          orderIndex: index,
        }))

        // Batch update in database
        const { error } = await supabase
          .from('scenario_chapters')
          .upsert(
            updatedChapters.map(chapter => ({
              id: chapter.id,
              order_index: chapter.orderIndex,
              updated_at: new Date().toISOString(),
            }))
          )

        if (error) throw error

        // Update state
        const newChapters = new Map(chapters)
        const newChapterIds: string[] = []

        updatedChapters.forEach(chapter => {
          newChapters.set(chapter.id, chapter)
          newChapterIds.push(chapter.id)
        })

        set({
          chapters: newChapters,
          chaptersByScenario: new Map(chaptersByScenario).set(scenarioId, newChapterIds),
        })
      },

      batchUpdateChapters: async (updates) => {
        const { chapters } = get()

        // Update database in batch
        const { error } = await supabase
          .from('scenario_chapters')
          .upsert(
            updates.map(({ id, updates: chapterUpdates }) => ({
              id,
              ...chapterUpdates,
              updated_at: new Date().toISOString(),
            }))
          )

        if (error) throw error

        // Update state
        const newChapters = new Map(chapters)
        updates.forEach(({ id, updates: chapterUpdates }) => {
          const existingChapter = newChapters.get(id)
          if (existingChapter) {
            newChapters.set(id, {
              ...existingChapter,
              ...chapterUpdates,
              updatedAt: new Date().toISOString(),
            })
          }
        })

        set({ chapters: newChapters })
      },

      setCurrentScenario: (scenarioId: string | null) => {
        set({ currentScenarioId: scenarioId })
      },

      setCurrentChapter: (chapterId: string | null) => {
        set({ currentChapterId: chapterId })
      },

      clearUnusedData: () => {
        const { currentScenarioId, scenarios, chapters, chaptersByScenario } = get()
        
        if (!currentScenarioId) return

        // Keep only current scenario and its chapters
        const currentChapterIds = chaptersByScenario.get(currentScenarioId) || []
        
        // Clear scenarios
        const newScenarios = new Map<string, Scenario>()
        const currentScenario = scenarios.get(currentScenarioId)
        if (currentScenario) {
          newScenarios.set(currentScenarioId, currentScenario)
        }

        // Clear chapters
        const newChapters = new Map<string, ScenarioChapter>()
        currentChapterIds.forEach(id => {
          const chapter = chapters.get(id)
          if (chapter) {
            newChapters.set(id, chapter)
          }
        })

        // Clear chapter mappings
        const newChaptersByScenario = new Map<string, string[]>()
        newChaptersByScenario.set(currentScenarioId, currentChapterIds)

        set({
          scenarios: newScenarios,
          chapters: newChapters,
          chaptersByScenario: newChaptersByScenario,
        })

        // Clear debounced operations for removed scenarios
        for (const [scenarioId, debouncedSave] of debouncedSaveOperations.entries()) {
          if (scenarioId !== currentScenarioId) {
            debouncedSave.cancel()
            debouncedSaveOperations.delete(scenarioId)
          }
        }
      },

      preloadScenario: async (scenarioId: string) => {
        // Preload scenario data without setting it as current
        const { scenarios } = get()
        if (scenarios.has(scenarioId)) return

        try {
          await get().loadScenario(scenarioId)
        } catch (error) {
          console.warn(`Failed to preload scenario ${scenarioId}:`, error)
        }
      },
    })
  )
)