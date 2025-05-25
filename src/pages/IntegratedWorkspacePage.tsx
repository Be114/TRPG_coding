import React, { memo, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useOptimizedScenarioStore } from '@/stores/optimizedScenarioStore'
import { useMapStore } from '@/stores/mapStore'
import { usePerformanceMonitor, detectMemoryLeaks } from '@/lib/performance'
import { WorkspaceManager } from '@/components/workspace/WorkspaceManager'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Map as MapIcon, 
  Plus, 
  Settings, 
  BarChart3,
  Zap,
  Users,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy load components for better performance with error handling
const OptimizedScenarioEditor = React.lazy(() => 
  import('@/components/editor/OptimizedScenarioEditor')
    .then(module => ({
      default: module.OptimizedScenarioEditor
    }))
    .catch(error => {
      console.error('Failed to load OptimizedScenarioEditor:', error)
      // Return a fallback component instead of failing
      return {
        default: () => (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive mb-4">シナリオエディタの読み込みに失敗しました</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                再読み込み
              </button>
            </div>
          </div>
        )
      }
    })
)

const OptimizedMapEditor = React.lazy(() => 
  import('@/components/editor/OptimizedMapEditor')
    .then(module => ({
      default: module.OptimizedMapEditor
    }))
    .catch(error => {
      console.error('Failed to load OptimizedMapEditor:', error)
      // Return a fallback component instead of failing
      return {
        default: () => (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive mb-4">マップエディタの読み込みに失敗しました</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                再読み込み
              </button>
            </div>
          </div>
        )
      }
    })
)

// Loading component for Suspense
const EditorLoading = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">エディタを読み込んでいます...</p>
    </div>
  </div>
))

EditorLoading.displayName = 'EditorLoading'

// Performance metrics display component
const PerformanceIndicator = memo(() => {
  const monitor = usePerformanceMonitor()
  const [metrics, setMetrics] = React.useState(monitor.getMetrics())
  
  useEffect(() => {
    const unsubscribe = monitor.subscribe(setMetrics)
    return unsubscribe
  }, [monitor])
  
  const memoryStatus = useMemo(() => {
    if (!metrics.memoryUsage) return 'unknown'
    if (metrics.memoryUsage < 100) return 'good'
    if (metrics.memoryUsage < 300) return 'warning'
    return 'critical'
  }, [metrics.memoryUsage])
  
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <BarChart3 className="w-3 h-3" />
      {metrics.memoryUsage && (
        <span className={cn(
          memoryStatus === 'good' && 'text-green-600',
          memoryStatus === 'warning' && 'text-yellow-600', 
          memoryStatus === 'critical' && 'text-red-600'
        )}>
          {metrics.memoryUsage.toFixed(1)}MB
        </span>
      )}
      {metrics.lcp && (
        <span>LCP: {metrics.lcp.toFixed(0)}ms</span>
      )}
    </div>
  )
})

PerformanceIndicator.displayName = 'PerformanceIndicator'

// Main workspace content component
const WorkspaceContent = memo(() => {
  const { getActiveTab } = useWorkspaceStore()
  const activeTab = getActiveTab()
  
  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <FileText className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-4">統合ワークスペースへようこそ</h2>
          <p className="text-muted-foreground mb-6">
            シナリオとマップを同時に編集できる統合環境です。
            左のパネルから編集したいコンテンツを選択してください。
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 border rounded-lg">
              <FileText className="w-8 h-8 mb-2 text-blue-500" />
              <h3 className="font-medium mb-1">シナリオエディタ</h3>
              <p className="text-muted-foreground">TipTapベースの高機能エディタで物語を執筆</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <MapIcon className="w-8 h-8 mb-2 text-green-500" />
              <h3 className="font-medium mb-1">マップエディタ</h3>
              <p className="text-muted-foreground">Konvaベースの直感的なマップ作成ツール</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <Suspense fallback={<EditorLoading />}>
      {activeTab.type === 'scenario' ? (
        <OptimizedScenarioEditor
          scenarioId={activeTab.resourceId}
          projectId={activeTab.projectId}
        />
      ) : (
        <OptimizedMapEditor
          mapId={activeTab.resourceId}
          projectId={activeTab.projectId}
        />
      )}
    </Suspense>
  )
})

WorkspaceContent.displayName = 'WorkspaceContent'

// Quick actions panel
const QuickActionsPanel = memo<{ projectId: string }>(({ projectId }) => {
  const { openTab } = useWorkspaceStore()
  const createScenario = useOptimizedScenarioStore(state => state.createChapter)
  const createMap = useMapStore(state => state.createMap)
  
  const handleCreateScenario = useCallback(async () => {
    try {
      // This would need to be implemented with scenario creation
      // For now, just show that it would open a new scenario tab
      openTab({
        type: 'scenario',
        title: '新しいシナリオ',
        projectId,
        resourceId: 'new-scenario',
        isPinned: false,
      })
    } catch (error) {
      console.error('Failed to create scenario:', error)
    }
  }, [openTab, projectId])
  
  const handleCreateMap = useCallback(async () => {
    try {
      const map = await createMap(projectId, '新しいマップ')
      openTab({
        type: 'map',
        title: map.title,
        projectId,
        resourceId: map.id,
        isPinned: false,
      })
    } catch (error) {
      console.error('Failed to create map:', error)
    }
  }, [createMap, openTab, projectId])
  
  return (
    <div className="p-4 border-b">
      <h3 className="font-medium mb-3">クイックアクション</h3>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleCreateScenario}
        >
          <FileText className="w-4 h-4 mr-2" />
          新しいシナリオ
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleCreateMap}
        >
          <MapIcon className="w-4 h-4 mr-2" />
          新しいマップ
        </Button>
      </div>
    </div>
  )
})

QuickActionsPanel.displayName = 'QuickActionsPanel'

export const IntegratedWorkspacePage: React.FC = memo(() => {
  const { projectId } = useParams<{ projectId: string }>()
  const monitor = usePerformanceMonitor()
  
  // Track page load performance
  useEffect(() => {
    monitor.mark('workspace-page-load')
    
    return () => {
      monitor.measure('workspace-page-duration', 'workspace-page-load')
    }
  }, [monitor])
  
  // Memory leak detection
  useEffect(() => {
    const detector = detectMemoryLeaks()
    
    const interval = setInterval(() => {
      const result = detector.check()
      if (result?.hasLeak) {
        console.warn('Memory leak detected in workspace:', result)
      }
    }, 30000) // Check every 30 seconds
    
    return () => {
      clearInterval(interval)
    }
  }, [])
  
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">プロジェクトが見つかりません</h2>
          <p className="text-muted-foreground">有効なプロジェクトIDが必要です。</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">TRPG統合ワークスペース</h1>
            <span className="text-sm text-muted-foreground">プロジェクト: {projectId}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <PerformanceIndicator />
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" />
                検索
              </Button>
              
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                共有
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <Tabs defaultValue="content" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2">
              <TabsTrigger value="content">コンテンツ</TabsTrigger>
              <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
              <TabsTrigger value="collaboration">コラボ</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="flex-1 overflow-auto">
              <QuickActionsPanel projectId={projectId} />
              
              <div className="p-4">
                <h3 className="font-medium mb-3">最近のファイル</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>プロジェクトファイルの読み込み機能は開発中です</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="flex-1 overflow-auto p-4">
              <h3 className="font-medium mb-3">パフォーマンス監視</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span>メモリ使用量</span>
                    <PerformanceIndicator />
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>最適化機能</span>
                  </div>
                  <p className="text-muted-foreground">
                    React.memo、useCallback、仮想化による高速化
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="collaboration" className="flex-1 overflow-auto p-4">
              <h3 className="font-medium mb-3">コラボレーション</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>リアルタイム共有</span>
                  </div>
                  <p className="text-muted-foreground">準備中</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Main Workspace */}
        <div className="flex-1">
          <WorkspaceManager>
            <WorkspaceContent />
          </WorkspaceManager>
        </div>
      </div>
    </div>
  )
})

IntegratedWorkspacePage.displayName = 'IntegratedWorkspacePage'