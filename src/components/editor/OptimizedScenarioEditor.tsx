import React, { memo, useCallback, useMemo, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Underline } from '@tiptap/extension-underline'

import { useOptimizedScenarioStore } from '@/stores/optimizedScenarioStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useCrossReference, CrossReferenceExtension } from '@/lib/crossReference'
import { usePerformanceMonitor, measureAsyncOperation } from '@/lib/performance'
import { EditorToolbar } from './EditorToolbar'
import { ChapterTree } from './ChapterTree'
import { VersionHistory } from './VersionHistory'
import { cn } from '@/lib/utils'

interface OptimizedScenarioEditorProps {
  scenarioId: string
  projectId: string
  className?: string
}

// Memoized toolbar component
const MemoizedEditorToolbar = memo(EditorToolbar)

// Memoized chapter tree component  
const MemoizedChapterTree = memo(ChapterTree)

// Memoized version history component
const MemoizedVersionHistory = memo(VersionHistory)

export const OptimizedScenarioEditor: React.FC<OptimizedScenarioEditorProps> = memo(({
  scenarioId,
  projectId,
  className
}) => {
  const monitor = usePerformanceMonitor()
  const editorRef = useRef<HTMLDivElement>(null)
  const { manager } = useCrossReference()
  
  // Optimized store selectors with shallow comparison
  const scenario = useOptimizedScenarioStore(
    useCallback(state => state.getCurrentScenario(), [])
  )
  
  const chapters = useOptimizedScenarioStore(
    useCallback(state => state.getScenarioChapters(scenarioId), [scenarioId])
  )
  
  const currentChapter = useOptimizedScenarioStore(
    useCallback(state => state.getCurrentChapter(), [])
  )
  
  const autoSaveState = useOptimizedScenarioStore(
    useCallback(state => state.getAutoSaveState(scenarioId), [scenarioId])
  )
  
  // Store actions with useCallback for stability
  const loadScenario = useOptimizedScenarioStore(useCallback(state => state.loadScenario, []))
  const updateScenarioContent = useOptimizedScenarioStore(useCallback(state => state.updateScenarioContent, []))
  const updateChapterContent = useOptimizedScenarioStore(useCallback(state => state.updateChapterContent, []))
  const setCurrentChapter = useOptimizedScenarioStore(useCallback(state => state.setCurrentChapter, []))
  
  // Workspace integration
  const { updateTab, getActiveTab } = useWorkspaceStore()
  
  // Editor extensions with memoization
  const extensions = useMemo(() => [
    StarterKit.configure({
      history: {
        depth: 50, // Limit history depth for performance
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: currentChapter 
        ? `${currentChapter.title}の内容を書いてください...`
        : 'シナリオの内容を書いてください...',
    }),
    CharacterCount,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    TaskItem.configure({
      nested: true,
    }),
    Underline,
    CrossReferenceExtension,
  ], [currentChapter?.title])

  // Editor instance with optimized update handling
  const editor = useEditor({
    extensions,
    content: currentChapter?.content || scenario?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
    onUpdate: useCallback(({ editor }) => {
      const content = editor.getJSON()
      
      // Debounced content update
      if (currentChapter) {
        updateChapterContent(currentChapter.id, content)
      } else if (scenario) {
        updateScenarioContent(scenario.id, content)
      }
      
      // Update workspace tab state
      const activeTab = getActiveTab()
      if (activeTab) {
        updateTab(activeTab.id, {
          lastAccessed: new Date(),
        })
      }
    }, [currentChapter, scenario, updateChapterContent, updateScenarioContent, getActiveTab, updateTab]),
    
    // Performance optimization: batch DOM updates
    editable: true,
    injectCSS: false, // Use external CSS for better performance
  }, [currentChapter?.id, scenario?.id])

  // Load scenario data on mount
  useEffect(() => {
    if (scenarioId) {
      measureAsyncOperation('load-scenario-editor', () => loadScenario(scenarioId))
    }
  }, [scenarioId, loadScenario])

  // Update editor content when chapter changes
  useEffect(() => {
    if (editor && (currentChapter || scenario)) {
      const newContent = currentChapter?.content || scenario?.content || ''
      const currentContent = editor.getJSON()
      
      // Only update if content actually changed to avoid unnecessary renders
      if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
        editor.commands.setContent(newContent, false)
      }
    }
  }, [editor, currentChapter?.content, scenario?.content, currentChapter?.id])

  // Register scenario and chapters for cross-referencing
  useEffect(() => {
    if (scenario) {
      manager.registerScenario(
        scenario.id,
        scenario.title,
        scenario.projectId,
        // Generate preview from content
        scenario.content ? JSON.stringify(scenario.content).slice(0, 200) : undefined
      )
    }
    
    chapters.forEach(chapter => {
      manager.registerChapter(
        chapter.id,
        chapter.title,
        projectId,
        chapter.scenarioId,
        chapter.content ? JSON.stringify(chapter.content).slice(0, 200) : undefined
      )
    })
  }, [scenario, chapters, projectId, manager])

  // Auto-save indicator memoization
  const autoSaveIndicator = useMemo(() => {
    if (autoSaveState.isSaving) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          保存中...
        </div>
      )
    }
    
    if (autoSaveState.hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-orange-500 rounded-full" />
          未保存の変更があります
        </div>
      )
    }
    
    if (autoSaveState.lastSaved) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          最終保存: {new Date(autoSaveState.lastSaved).toLocaleTimeString()}
        </div>
      )
    }
    
    return null
  }, [autoSaveState])

  // Chapter selection handler with useCallback
  const handleChapterSelect = useCallback((chapterId: string | null) => {
    setCurrentChapter(chapterId)
    
    // Focus editor after chapter change
    requestAnimationFrame(() => {
      if (editor && editorRef.current) {
        editor.commands.focus()
      }
    })
  }, [setCurrentChapter, editor])

  // Character count memoization
  const characterCount = useMemo(() => {
    if (!editor) return 0
    return editor.storage.characterCount.characters()
  }, [editor?.storage.characterCount])

  // Word count memoization  
  const wordCount = useMemo(() => {
    if (!editor) return 0
    return editor.storage.characterCount.words()
  }, [editor?.storage.characterCount])

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">シナリオを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Left Sidebar - Chapter Tree */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg truncate" title={scenario.title}>
            {scenario.title}
          </h2>
          {autoSaveIndicator}
        </div>
        
        <MemoizedChapterTree
          chapters={chapters}
          selectedChapter={currentChapter}
          onChapterSelect={handleChapterSelect}
          scenarioId={scenarioId}
        />
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <MemoizedEditorToolbar editor={editor} />
        
        {/* Editor Content */}
        <div className="flex-1 overflow-auto" ref={editorRef}>
          <div className="max-w-4xl mx-auto p-6">
            {currentChapter && (
              <div className="mb-6 pb-4 border-b">
                <h1 className="text-2xl font-bold text-foreground">
                  {currentChapter.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  最終更新: {new Date(currentChapter.updatedAt).toLocaleString()}
                </p>
              </div>
            )}
            
            <EditorContent 
              editor={editor}
              className="min-h-[500px] focus-within:outline-none"
            />
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="border-t bg-muted/50 px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{wordCount} 単語</span>
            <span>{characterCount} 文字</span>
            {currentChapter && (
              <span>章: {currentChapter.title}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {autoSaveState.error && (
              <span className="text-destructive">保存エラー: {autoSaveState.error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Version History */}
      <div className="w-80 border-l bg-muted/30">
        <MemoizedVersionHistory scenarioId={scenarioId} />
      </div>
    </div>
  )
})

OptimizedScenarioEditor.displayName = 'OptimizedScenarioEditor'