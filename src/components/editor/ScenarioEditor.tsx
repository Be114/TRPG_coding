import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useProjectStore } from '@/stores/projectStore'
import { EditorCore } from './EditorCore'
import { EditorToolbar } from './EditorToolbar'
import { ChapterTree } from './ChapterTree'
import { ExportDialog } from './ExportDialog'
import { VersionHistory } from './VersionHistory'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Sidebar, 
  SidebarLeft, 
  Eye, 
  EyeOff, 
  Save,
  Download,
  History,
  MoreHorizontal,
  Maximize,
  Minimize,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Editor } from '@tiptap/react'

interface EditorState {
  focusMode: boolean
  zenMode: boolean
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  leftSidebarWidth: number
}

export function ScenarioEditor() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const { currentProject } = useProjectStore()
  
  const {
    currentScenario,
    chapters,
    currentChapter,
    autoSave,
    loading,
    error,
    loadScenario,
    updateScenarioContent,
    updateChapterContent,
    setCurrentChapter,
    saveScenario,
  } = useScenarioStore()

  const [editorState, setEditorState] = useState<EditorState>({
    focusMode: false,
    zenMode: false,
    leftSidebarVisible: true,
    rightSidebarVisible: false,
    leftSidebarWidth: 280,
  })

  const [currentEditor, setCurrentEditor] = useState<Editor | null>(null)

  // Load scenario on mount
  useEffect(() => {
    if (scenarioId) {
      loadScenario(scenarioId)
    }
  }, [scenarioId, loadScenario])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            saveScenario()
            break
          case '.':
            e.preventDefault()
            if (e.shiftKey) {
              // Zen mode (Cmd+Shift+.)
              setEditorState(prev => ({ ...prev, zenMode: !prev.zenMode }))
            } else {
              // Focus mode (Cmd+.)
              setEditorState(prev => ({ ...prev, focusMode: !prev.focusMode }))
            }
            break
          case '\\':
            e.preventDefault()
            setEditorState(prev => ({ 
              ...prev, 
              leftSidebarVisible: !prev.leftSidebarVisible 
            }))
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saveScenario])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">シナリオを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">エラーが発生しました: {error}</p>
          <Button onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </div>
      </div>
    )
  }

  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">シナリオが見つかりません。</p>
        </div>
      </div>
    )
  }

  const currentContent = currentChapter ? currentChapter.content : currentScenario.content
  const isChapterMode = !!currentChapter

  const handleContentUpdate = (content: any) => {
    if (isChapterMode && currentChapter) {
      updateChapterContent(currentChapter.id, content)
    } else {
      updateScenarioContent(content)
    }
  }

  const toggleLeftSidebar = () => {
    setEditorState(prev => ({ 
      ...prev, 
      leftSidebarVisible: !prev.leftSidebarVisible 
    }))
  }

  const toggleRightSidebar = () => {
    setEditorState(prev => ({ 
      ...prev, 
      rightSidebarVisible: !prev.rightSidebarVisible 
    }))
  }

  const isMinimalMode = editorState.focusMode || editorState.zenMode

  return (
    <div className="h-screen flex bg-background">
      {/* Left Sidebar - Chapter Tree */}
      {editorState.leftSidebarVisible && !editorState.zenMode && (
        <div 
          className="border-r bg-card"
          style={{ width: editorState.leftSidebarWidth }}
        >
          <ChapterTree
            chapters={chapters}
            currentChapter={currentChapter}
            onChapterSelect={setCurrentChapter}
          />
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with save status */}
        {!editorState.zenMode && (
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLeftSidebar}
              >
                <SidebarLeft className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-4" />
              
              <div className="text-sm">
                <span className="font-medium">{currentProject?.title}</span>
                <span className="text-muted-foreground"> / {currentScenario.title}</span>
                {currentChapter && (
                  <span className="text-muted-foreground"> / {currentChapter.title}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save status */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {autoSave.isSaving && (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                    <span>保存中...</span>
                  </>
                )}
                {autoSave.lastSaved && !autoSave.isSaving && (
                  <span>
                    {autoSave.lastSaved.toLocaleTimeString()} に保存済み
                  </span>
                )}
                {autoSave.hasUnsavedChanges && !autoSave.isSaving && (
                  <span className="text-amber-600">未保存の変更があります</span>
                )}
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* Mode toggles */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditorState(prev => ({ ...prev, focusMode: !prev.focusMode }))}
                title="フォーカスモード (Cmd+.)"
              >
                {editorState.focusMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditorState(prev => ({ ...prev, zenMode: !prev.zenMode }))}
                title="禅モード (Cmd+Shift+.)"
              >
                {editorState.zenMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              {/* Version History */}
              <VersionHistory
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    title="バージョン履歴"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                }
              />

              {/* Export */}
              <ExportDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    title="エクスポート"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                }
              />

              {/* Manual save */}
              <Button
                variant="ghost"
                size="sm"
                onClick={saveScenario}
                disabled={autoSave.isSaving}
                title="手動保存 (Cmd+S)"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          {!isMinimalMode && <EditorToolbar editor={currentEditor} />}

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto">
            <div className={cn(
              "mx-auto p-6",
              isMinimalMode ? "max-w-4xl" : "max-w-4xl",
              editorState.zenMode && "pt-20"
            )}>
              <EditorCore
                content={currentContent}
                onUpdate={handleContentUpdate}
                onEditorReady={setCurrentEditor}
                placeholder={
                  isChapterMode 
                    ? `${currentChapter.title} の内容を書いてください...`
                    : `${currentScenario.title} の内容を書いてください...`
                }
                className={cn(
                  "min-h-[calc(100vh-300px)]",
                  isMinimalMode && "min-h-[calc(100vh-100px)]"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Document Info */}
      {editorState.rightSidebarVisible && !editorState.zenMode && (
        <div className="w-80 border-l bg-card p-4">
          <h3 className="font-semibold mb-4">ドキュメント情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">文字数</label>
              <p className="text-lg font-mono">{currentScenario.wordCount.toLocaleString()}</p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">最終更新</label>
              <p className="text-sm">
                {new Date(currentScenario.lastEditedAt).toLocaleString()}
              </p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">バージョン</label>
              <p className="text-sm">{currentScenario.version}</p>
            </div>

            <Separator />

            <div>
              <label className="text-sm text-muted-foreground">チャプター数</label>
              <p className="text-lg">{chapters.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Zen mode overlay with minimal controls */}
      {editorState.zenMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditorState(prev => ({ ...prev, zenMode: false }))}
            className="bg-background/80 backdrop-blur"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}