import React, { useCallback, useEffect } from 'react'
import { useWorkspaceStore, WorkspaceTab } from '@/stores/workspaceStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  Pin, 
  PinOff, 
  RotateCcw, 
  SplitSquareHorizontal, 
  SplitSquareVertical,
  Maximize,
  FileText,
  Map,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceManagerProps {
  children: React.ReactNode
  className?: string
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ 
  children, 
  className 
}) => {
  const {
    tabs,
    activeTabId,
    recentlyClosedTabs,
    splitDirection,
    splitRatio,
    closeTab,
    setActiveTab,
    pinTab,
    unpinTab,
    restoreTab,
    enableSplitView,
    disableSplitView,
    setSplitRatio,
  } = useWorkspaceStore()

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  const handleTabClose = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    closeTab(tabId)
  }, [closeTab])

  const handleTabPin = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.isPinned) {
      unpinTab(tabId)
    } else {
      pinTab(tabId)
    }
  }, [tabs, pinTab, unpinTab])

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'scenario':
        return <FileText className="w-3 h-3" />
      case 'map':
        return <Map className="w-3 h-3" />
      default:
        return null
    }
  }

  const handleSplitResize = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    const startY = e.clientY
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('[data-workspace-container]')
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      
      if (splitDirection === 'vertical') {
        const newRatio = (e.clientX - rect.left) / rect.width
        setSplitRatio(newRatio)
      } else if (splitDirection === 'horizontal') {
        const newRatio = (e.clientY - rect.top) / rect.height
        setSplitRatio(newRatio)
      }
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [splitDirection, setSplitRatio])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'w':
            e.preventDefault()
            if (activeTabId) closeTab(activeTabId)
            break
          case 't':
            e.preventDefault()
            // Open new tab functionality could be added here
            break
          case 'Tab':
            e.preventDefault()
            // Switch to next tab
            const currentIndex = tabs.findIndex(tab => tab.id === activeTabId)
            const nextIndex = (currentIndex + 1) % tabs.length
            if (tabs[nextIndex]) {
              setActiveTab(tabs[nextIndex].id)
            }
            break
          case '\\':
            e.preventDefault()
            if (splitDirection === 'none') {
              enableSplitView('vertical')
            } else {
              disableSplitView()
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, splitDirection, closeTab, setActiveTab, enableSplitView, disableSplitView])

  if (tabs.length === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">ワークスペースが空です</h3>
            <p className="text-sm text-muted-foreground mb-4">
              シナリオやマップを開いて編集を始めましょう
            </p>
            {recentlyClosedTabs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">最近閉じたタブ:</p>
                {recentlyClosedTabs.slice(0, 3).map(tab => (
                  <Button
                    key={tab.id}
                    variant="outline"
                    size="sm"
                    onClick={() => restoreTab(tab.id)}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {tab.title}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)} data-workspace-container>
      {/* Tab Bar */}
      <div className="flex items-center border-b bg-background px-2 py-1">
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-1">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  tab.isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  tab.isPinned && "bg-primary/10"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {getTabIcon(tab.type)}
                <span className="truncate max-w-32">{tab.title}</span>
                
                {tab.isPinned && (
                  <Pin className="w-3 h-3 flex-shrink-0" />
                )}
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-accent"
                    onClick={(e) => handleTabPin(tab.id, e)}
                  >
                    {tab.isPinned ? (
                      <PinOff className="w-2 h-2" />
                    ) : (
                      <Pin className="w-2 h-2" />
                    )}
                  </Button>
                  
                  {!tab.isPinned && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleTabClose(tab.id, e)}
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Workspace Controls */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => enableSplitView('horizontal')}
            disabled={splitDirection === 'horizontal'}
            title="水平分割"
          >
            <SplitSquareHorizontal className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => enableSplitView('vertical')}
            disabled={splitDirection === 'vertical'}
            title="垂直分割"
          >
            <SplitSquareVertical className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={disableSplitView}
            disabled={splitDirection === 'none'}
            title="分割解除"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative">
        {splitDirection === 'none' ? (
          // Single pane
          <div className="h-full">
            {children}
          </div>
        ) : splitDirection === 'vertical' ? (
          // Vertical split
          <div className="flex h-full">
            <div 
              className="h-full border-r"
              style={{ width: `${splitRatio * 100}%` }}
            >
              {children}
            </div>
            
            {/* Resize handle */}
            <div
              className="w-1 bg-border hover:bg-accent cursor-col-resize"
              onMouseDown={handleSplitResize}
            />
            
            <div 
              className="h-full bg-muted/20 flex items-center justify-center"
              style={{ width: `${(1 - splitRatio) * 100}%` }}
            >
              <p className="text-muted-foreground">右パネル (未実装)</p>
            </div>
          </div>
        ) : (
          // Horizontal split
          <div className="flex flex-col h-full">
            <div 
              className="border-b"
              style={{ height: `${splitRatio * 100}%` }}
            >
              {children}
            </div>
            
            {/* Resize handle */}
            <div
              className="h-1 bg-border hover:bg-accent cursor-row-resize"
              onMouseDown={handleSplitResize}
            />
            
            <div 
              className="bg-muted/20 flex items-center justify-center"
              style={{ height: `${(1 - splitRatio) * 100}%` }}
            >
              <p className="text-muted-foreground">下パネル (未実装)</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {activeTab && (
            <>
              <span>{activeTab.type === 'scenario' ? 'シナリオ' : 'マップ'}: {activeTab.title}</span>
              <span>プロジェクト: {activeTab.projectId}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span>{tabs.length} タブ開いています</span>
          {recentlyClosedTabs.length > 0 && (
            <span>{recentlyClosedTabs.length} 個の復元可能なタブ</span>
          )}
        </div>
      </div>
    </div>
  )
}