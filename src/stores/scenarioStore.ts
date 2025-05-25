import { create } from 'zustand'
import { Scenario, ScenarioChapter, AutoSaveState } from '@/types'
import { supabase } from '@/lib/supabase'

interface ScenarioState {
  // State
  currentScenario: Scenario | null
  chapters: ScenarioChapter[]
  currentChapter: ScenarioChapter | null
  autoSave: AutoSaveState
  loading: boolean
  error: string | null

  // Actions
  loadScenario: (scenarioId: string) => Promise<void>
  updateScenarioContent: (content: any) => void
  updateChapterContent: (chapterId: string, content: any) => void
  saveScenario: () => Promise<void>
  createChapter: (title: string, parentId?: string) => Promise<ScenarioChapter>
  updateChapter: (chapterId: string, updates: Partial<ScenarioChapter>) => Promise<void>
  deleteChapter: (chapterId: string) => Promise<void>
  setCurrentChapter: (chapter: ScenarioChapter | null) => void
  reorderChapters: (chapters: ScenarioChapter[]) => Promise<void>

  // Auto-save functionality
  markUnsaved: () => void
  startAutoSave: () => void
  stopAutoSave: () => void
}

let autoSaveTimeout: NodeJS.Timeout | null = null

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  // Initial state
  currentScenario: null,
  chapters: [],
  currentChapter: null,
  autoSave: {
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  },
  loading: false,
  error: null,

  loadScenario: async (scenarioId: string) => {
    set({ loading: true, error: null })
    try {
      // Load scenario
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single()

      if (scenarioError) throw scenarioError

      // Load chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('scenario_chapters')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('order_index', { ascending: true })

      if (chaptersError) throw chaptersError

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

      set({
        currentScenario: scenario,
        chapters,
        currentChapter: chapters[0] || null,
        loading: false,
      })

      // Start auto-save
      get().startAutoSave()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateScenarioContent: (content: any) => {
    const { currentScenario } = get()
    if (!currentScenario) return

    const wordCount = content ? JSON.stringify(content).length : 0
    
    set({
      currentScenario: {
        ...currentScenario,
        content,
        wordCount,
        lastEditedAt: new Date().toISOString(),
      },
    })

    get().markUnsaved()
  },

  updateChapterContent: (chapterId: string, content: any) => {
    const { chapters } = get()
    
    const updatedChapters = chapters.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, content, updatedAt: new Date().toISOString() }
        : chapter
    )

    set({
      chapters: updatedChapters,
      currentChapter: get().currentChapter?.id === chapterId
        ? { ...get().currentChapter!, content, updatedAt: new Date().toISOString() }
        : get().currentChapter,
    })

    get().markUnsaved()
  },

  saveScenario: async () => {
    const { currentScenario, chapters, autoSave } = get()
    if (!currentScenario || autoSave.isSaving) return

    set({
      autoSave: { ...autoSave, isSaving: true, error: null }
    })

    try {
      // Save scenario
      const { error: scenarioError } = await supabase
        .from('scenarios')
        .update({
          content: currentScenario.content,
          word_count: currentScenario.wordCount,
          last_edited_at: currentScenario.lastEditedAt,
          version: currentScenario.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentScenario.id)

      if (scenarioError) throw scenarioError

      // Save chapters
      for (const chapter of chapters) {
        const { error: chapterError } = await supabase
          .from('scenario_chapters')
          .upsert({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            scenario_id: chapter.scenarioId,
            order_index: chapter.orderIndex,
            parent_id: chapter.parentId,
            updated_at: new Date().toISOString(),
          })

        if (chapterError) throw chapterError
      }

      set({
        currentScenario: {
          ...currentScenario,
          version: currentScenario.version + 1,
          updatedAt: new Date().toISOString(),
        },
        autoSave: {
          isSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          error: null,
        }
      })
    } catch (error) {
      set({
        autoSave: {
          ...autoSave,
          isSaving: false,
          error: (error as Error).message,
        }
      })
    }
  },

  createChapter: async (title: string, parentId?: string) => {
    const { currentScenario, chapters } = get()
    if (!currentScenario) throw new Error('No scenario loaded')

    const maxOrderIndex = Math.max(...chapters.map(c => c.orderIndex), -1)

    const { data, error } = await supabase
      .from('scenario_chapters')
      .insert({
        title,
        scenario_id: currentScenario.id,
        order_index: maxOrderIndex + 1,
        parent_id: parentId || null,
        content: { type: 'doc', content: [] }, // Empty TipTap document
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

    set({
      chapters: [...chapters, newChapter],
    })

    return newChapter
  },

  updateChapter: async (chapterId: string, updates: Partial<ScenarioChapter>) => {
    const { chapters } = get()

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

    const updatedChapters = chapters.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, ...updates, updatedAt: new Date().toISOString() }
        : chapter
    )

    set({
      chapters: updatedChapters,
      currentChapter: get().currentChapter?.id === chapterId
        ? { ...get().currentChapter!, ...updates, updatedAt: new Date().toISOString() }
        : get().currentChapter,
    })
  },

  deleteChapter: async (chapterId: string) => {
    const { chapters } = get()

    const { error } = await supabase
      .from('scenario_chapters')
      .delete()
      .eq('id', chapterId)

    if (error) throw error

    const updatedChapters = chapters.filter(c => c.id !== chapterId)
    
    set({
      chapters: updatedChapters,
      currentChapter: get().currentChapter?.id === chapterId
        ? updatedChapters[0] || null
        : get().currentChapter,
    })
  },

  setCurrentChapter: (chapter: ScenarioChapter | null) => {
    set({ currentChapter: chapter })
  },

  reorderChapters: async (reorderedChapters: ScenarioChapter[]) => {
    // Update order indices
    const updatedChapters = reorderedChapters.map((chapter, index) => ({
      ...chapter,
      orderIndex: index,
    }))

    // Update in database
    for (const chapter of updatedChapters) {
      await supabase
        .from('scenario_chapters')
        .update({ order_index: chapter.orderIndex })
        .eq('id', chapter.id)
    }

    set({ chapters: updatedChapters })
  },

  markUnsaved: () => {
    const { autoSave } = get()
    set({
      autoSave: { ...autoSave, hasUnsavedChanges: true }
    })
  },

  startAutoSave: () => {
    get().stopAutoSave() // Clear any existing timeout
    
    autoSaveTimeout = setInterval(() => {
      const { autoSave } = get()
      if (autoSave.hasUnsavedChanges && !autoSave.isSaving) {
        get().saveScenario()
      }
    }, 3000) // Auto-save every 3 seconds
  },

  stopAutoSave: () => {
    if (autoSaveTimeout) {
      clearInterval(autoSaveTimeout)
      autoSaveTimeout = null
    }
  },
}))