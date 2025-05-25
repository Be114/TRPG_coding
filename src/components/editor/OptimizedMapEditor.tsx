import React, { memo, useCallback, useMemo, useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text } from 'react-konva'
import { useMapStore } from '@/stores/mapStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { usePerformanceMonitor, measureAsyncOperation } from '@/lib/performance'
import { MapToolbar } from './map/MapToolbar'
import { MapLayerPanel } from './map/MapLayerPanel'
import { MapSettings } from './map/MapSettings'
import { MapAssetPanel } from './map/MapAssetPanel'
import { cn } from '@/lib/utils'
import { debounce } from 'lodash'

interface OptimizedMapEditorProps {
  mapId: string
  projectId: string
  className?: string
}

// Memoized components for better performance
const MemoizedMapToolbar = memo(MapToolbar)
const MemoizedMapLayerPanel = memo(MapLayerPanel)
const MemoizedMapSettings = memo(MapSettings)
const MemoizedMapAssetPanel = memo(MapAssetPanel)

// Grid component with memoization
const GridLayer = memo<{
  width: number
  height: number
  gridSize: number
  gridColor: string
  visible: boolean
}>(({ width, height, gridSize, gridColor, visible }) => {
  if (!visible) return null

  const lines: JSX.Element[] = []
  
  // Vertical lines
  for (let i = 0; i <= width; i += gridSize) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, height * gridSize]}
        stroke={gridColor}
        strokeWidth={1}
        opacity={0.5}
      />
    )
  }
  
  // Horizontal lines
  for (let i = 0; i <= height; i += gridSize) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * gridSize, width * gridSize, i * gridSize]}
        stroke={gridColor}
        strokeWidth={1}
        opacity={0.5}
      />
    )
  }
  
  return <>{lines}</>
})

GridLayer.displayName = 'GridLayer'

// Drawing layer component with performance optimizations
const DrawingLayer = memo<{
  objects: any[]
  layerId: string
  visible: boolean
  opacity: number
  locked: boolean
}>(({ objects, layerId, visible, opacity, locked }) => {
  if (!visible) return null
  
  const shapes = useMemo(() => {
    return objects.map((obj, index) => {
      switch (obj.type) {
        case 'rectangle':
          return (
            <Rect
              key={`${layerId}-rect-${index}`}
              x={obj.x}
              y={obj.y}
              width={obj.width}
              height={obj.height}
              fill={obj.fill || '#000000'}
              stroke={obj.stroke || '#000000'}
              strokeWidth={obj.strokeWidth || 1}
              rotation={obj.rotation || 0}
              opacity={opacity}
              listening={!locked}
            />
          )
        case 'circle':
          return (
            <Circle
              key={`${layerId}-circle-${index}`}
              x={obj.x}
              y={obj.y}
              radius={obj.radius || 10}
              fill={obj.fill || '#000000'}
              stroke={obj.stroke || '#000000'}
              strokeWidth={obj.strokeWidth || 1}
              opacity={opacity}
              listening={!locked}
            />
          )
        case 'line':
          return (
            <Line
              key={`${layerId}-line-${index}`}
              points={obj.points || []}
              stroke={obj.stroke || '#000000'}
              strokeWidth={obj.strokeWidth || 2}
              opacity={opacity}
              listening={!locked}
            />
          )
        case 'text':
          return (
            <Text
              key={`${layerId}-text-${index}`}
              x={obj.x}
              y={obj.y}
              text={obj.text || ''}
              fontSize={obj.fontSize || 16}
              fill={obj.fill || '#000000'}
              opacity={opacity}
              listening={!locked}
            />
          )
        default:
          return null
      }
    })
  }, [objects, layerId, opacity, locked])
  
  return <>{shapes}</>
})

DrawingLayer.displayName = 'DrawingLayer'

export const OptimizedMapEditor: React.FC<OptimizedMapEditorProps> = memo(({
  mapId,
  projectId,
  className
}) => {
  const monitor = usePerformanceMonitor()
  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Optimized store selectors
  const map = useMapStore(useCallback(state => 
    state.maps.find(m => m.id === mapId), [mapId]
  ))
  
  const editorState = useMapStore(useCallback(state => state.editorState, []))
  
  // Store actions with stability
  const fetchMaps = useMapStore(useCallback(state => state.fetchMaps, []))
  const setCurrentMap = useMapStore(useCallback(state => state.setCurrentMap, []))
  const setSelectedTool = useMapStore(useCallback(state => state.setSelectedTool, []))
  const setZoom = useMapStore(useCallback(state => state.setZoom, []))
  const setPan = useMapStore(useCallback(state => state.setPan, []))
  const setIsDrawing = useMapStore(useCallback(state => state.setIsDrawing, []))
  const autoSave = useMapStore(useCallback(state => state.autoSave, []))
  
  // Workspace integration
  const { updateTab, getActiveTab } = useWorkspaceStore()
  
  // Debounced auto-save
  const debouncedAutoSave = useMemo(
    () => debounce(() => {
      measureAsyncOperation('auto-save-map', autoSave)
    }, 3000),
    [autoSave]
  )
  
  // Load map data
  useEffect(() => {
    if (mapId && !map) {
      measureAsyncOperation('load-map-editor', () => fetchMaps(projectId))
    }
  }, [mapId, projectId, map, fetchMaps])
  
  // Set current map when component mounts
  useEffect(() => {
    if (map) {
      setCurrentMap(map)
    }
  }, [map, setCurrentMap])
  
  // Canvas dimensions with memoization
  const canvasSize = useMemo(() => {
    if (!map) return { width: 800, height: 600 }
    
    return {
      width: map.data.width * map.data.gridSize,
      height: map.data.height * map.data.gridSize
    }
  }, [map?.data.width, map?.data.height, map?.data.gridSize])
  
  // Viewport size calculation
  const [viewportSize, setViewportSize] = React.useState({ width: 800, height: 600 })
  
  useEffect(() => {
    const updateViewportSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setViewportSize({
          width: rect.width,
          height: rect.height
        })
      }
    }
    
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    return () => window.removeEventListener('resize', updateViewportSize)
  }, [])
  
  // Drawing handlers
  const handleMouseDown = useCallback((e: any) => {
    if (!map || editorState.selectedTool.type === 'select') return
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    
    if (!point) return
    
    setIsDrawing(true)
    
    // Start drawing based on selected tool
    const { selectedTool } = editorState
    monitor.mark('drawing-start')
    
    // Update workspace tab
    const activeTab = getActiveTab()
    if (activeTab) {
      updateTab(activeTab.id, {
        lastAccessed: new Date(),
      })
    }
  }, [map, editorState.selectedTool, setIsDrawing, monitor, getActiveTab, updateTab])
  
  const handleMouseMove = useCallback((e: any) => {
    if (!editorState.isDrawing || !map) return
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    
    if (!point) return
    
    // Continue drawing based on selected tool
    // Implementation would continue here...
    
  }, [editorState.isDrawing, map])
  
  const handleMouseUp = useCallback(() => {
    if (!editorState.isDrawing) return
    
    setIsDrawing(false)
    monitor.mark('drawing-end')
    monitor.measure('drawing-operation', 'drawing-start', 'drawing-end')
    
    // Trigger auto-save
    debouncedAutoSave()
  }, [editorState.isDrawing, setIsDrawing, monitor, debouncedAutoSave])
  
  // Wheel handler for zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault()
    
    const scaleBy = 1.1
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    
    if (!pointer) return
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    
    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))
    
    setZoom(clampedScale)
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }
    
    setPan(newPos.x, newPos.y)
    
    stage.scale({ x: clampedScale, y: clampedScale })
    stage.position(newPos)
    stage.batchDraw()
  }, [setZoom, setPan])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            autoSave()
            break
          case '0':
            e.preventDefault()
            setZoom(1)
            setPan(0, 0)
            if (stageRef.current) {
              stageRef.current.scale({ x: 1, y: 1 })
              stageRef.current.position({ x: 0, y: 0 })
              stageRef.current.batchDraw()
            }
            break
        }
      } else {
        // Tool shortcuts
        switch (e.key) {
          case 'v':
            setSelectedTool({ ...editorState.selectedTool, type: 'select' })
            break
          case 'p':
            setSelectedTool({ ...editorState.selectedTool, type: 'pen' })
            break
          case 'b':
            setSelectedTool({ ...editorState.selectedTool, type: 'brush' })
            break
          case 'e':
            setSelectedTool({ ...editorState.selectedTool, type: 'eraser' })
            break
          case 'r':
            setSelectedTool({ ...editorState.selectedTool, type: 'rectangle' })
            break
          case 'c':
            setSelectedTool({ ...editorState.selectedTool, type: 'circle' })
            break
          case 'l':
            setSelectedTool({ ...editorState.selectedTool, type: 'line' })
            break
          case 't':
            setSelectedTool({ ...editorState.selectedTool, type: 'text' })
            break
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editorState.selectedTool, setSelectedTool, setZoom, setPan, autoSave])
  
  if (!map) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">マップを読み込んでいます...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Left Panel - Layers */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg truncate" title={map.title}>
            {map.title}
          </h2>
        </div>
        
        <MemoizedMapLayerPanel map={map} />
      </div>
      
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <MemoizedMapToolbar 
          selectedTool={editorState.selectedTool}
          onToolChange={setSelectedTool}
          zoom={editorState.zoom}
          onZoomChange={setZoom}
        />
        
        {/* Canvas Container */}
        <div 
          className="flex-1 overflow-hidden bg-muted/10 relative"
          ref={containerRef}
        >
          <Stage
            ref={stageRef}
            width={viewportSize.width}
            height={viewportSize.height}
            scaleX={editorState.zoom}
            scaleY={editorState.zoom}
            x={editorState.panX}
            y={editorState.panY}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onWheel={handleWheel}
            draggable={editorState.selectedTool.type === 'select'}
          >
            {/* Background Layer */}
            <Layer>
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fill={map.data.settings.backgroundColor}
              />
            </Layer>
            
            {/* Grid Layer */}
            <Layer>
              <GridLayer
                width={map.data.width}
                height={map.data.height}
                gridSize={map.data.gridSize}
                gridColor={map.data.settings.gridColor}
                visible={map.data.settings.gridVisible}
              />
            </Layer>
            
            {/* Drawing Layers */}
            {map.data.layers.map((layer) => (
              <Layer key={layer.id} opacity={layer.opacity}>
                <DrawingLayer
                  objects={layer.objects}
                  layerId={layer.id}
                  visible={layer.visible}
                  opacity={layer.opacity}
                  locked={layer.locked}
                />
              </Layer>
            ))}
          </Stage>
          
          {/* Canvas Overlay Info */}
          <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border text-xs">
            <div>ズーム: {Math.round(editorState.zoom * 100)}%</div>
            <div>ツール: {editorState.selectedTool.type}</div>
            <div>グリッド: {map.data.gridSize}px</div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="border-t bg-muted/50 px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>サイズ: {map.data.width} × {map.data.height}</span>
            <span>レイヤー: {map.data.layers.length}</span>
            <span>選択ツール: {editorState.selectedTool.type}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span>座標: ({Math.round(-editorState.panX)}, {Math.round(-editorState.panY)})</span>
            <span>ズーム: {Math.round(editorState.zoom * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Settings & Assets */}
      <div className="w-80 border-l bg-muted/30 flex flex-col">
        <div className="flex-1">
          <MemoizedMapSettings map={map} />
        </div>
        <div className="flex-1 border-t">
          <MemoizedMapAssetPanel />
        </div>
      </div>
    </div>
  )
})

OptimizedMapEditor.displayName = 'OptimizedMapEditor'