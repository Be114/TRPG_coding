import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, Layers, Download, Package } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'
import { useProjectStore } from '@/stores/projectStore'
import { MapCanvas } from '@/components/editor/map/MapCanvas'
import { MapToolbar } from '@/components/editor/map/MapToolbar'
import { MapLayerPanel } from '@/components/editor/map/MapLayerPanel'
import { MapSettings } from '@/components/editor/map/MapSettings'
import { MapAssetPanel } from '@/components/editor/map/MapAssetPanel'
import { MapExportDialog } from '@/components/editor/map/MapExportDialog'

export function MapEditorPage() {
  const { projectId, mapId } = useParams()
  const navigate = useNavigate()
  
  const [rightPanelMode, setRightPanelMode] = useState<'layers' | 'settings' | 'assets'>('layers')
  const [rightPanelVisible, setRightPanelVisible] = useState(true)
  
  const {
    currentMap,
    maps,
    loading,
    error,
    fetchMaps,
    setCurrentMap,
  } = useMapStore()
  
  const { currentProject, setCurrentProject, projects } = useProjectStore()

  useEffect(() => {
    if (projectId && !currentProject) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject(project)
      }
    }
  }, [projectId, currentProject, projects, setCurrentProject])

  useEffect(() => {
    if (projectId) {
      fetchMaps(projectId)
    }
  }, [projectId, fetchMaps])

  useEffect(() => {
    if (mapId && maps.length > 0 && !currentMap) {
      const map = maps.find(m => m.id === mapId)
      if (map) {
        setCurrentMap(map)
      }
    }
  }, [mapId, maps, currentMap, setCurrentMap])

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  const toggleRightPanel = () => {
    setRightPanelVisible(!rightPanelVisible)
  }

  const switchRightPanelMode = (mode: 'layers' | 'settings' | 'assets') => {
    setRightPanelMode(mode)
    setRightPanelVisible(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-muted-foreground">マップを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">❌</div>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            再読み込み
          </Button>
        </div>
      </div>
    )
  }

  if (!currentMap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2">マップが見つかりません</h2>
          <p className="text-muted-foreground mb-4">
            指定されたマップが存在しないか、アクセス権限がありません。
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            プロジェクトに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{currentMap.title}</h1>
            {currentProject && (
              <p className="text-sm text-muted-foreground">
                {currentProject.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MapExportDialog>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              エクスポート
            </Button>
          </MapExportDialog>

          <Button
            variant={rightPanelMode === 'layers' && rightPanelVisible ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchRightPanelMode('layers')}
          >
            <Layers className="w-4 h-4 mr-2" />
            レイヤー
          </Button>

          <Button
            variant={rightPanelMode === 'settings' && rightPanelVisible ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchRightPanelMode('settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>

          <Button
            variant={rightPanelMode === 'assets' && rightPanelVisible ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchRightPanelMode('assets')}
          >
            <Package className="w-4 h-4 mr-2" />
            アセット
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <MapToolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <MapCanvas 
            width={window.innerWidth - (rightPanelVisible ? 320 : 0)}
            height={window.innerHeight - 120} // Account for header and toolbar
          />
        </div>

        {/* Right Panel */}
        {rightPanelVisible && (
          <div className="w-80 border-l border-gray-200 bg-white">
            {rightPanelMode === 'layers' && <MapLayerPanel />}
            {rightPanelMode === 'settings' && <MapSettings />}
            {rightPanelMode === 'assets' && <MapAssetPanel />}
          </div>
        )}
      </div>
    </div>
  )
}