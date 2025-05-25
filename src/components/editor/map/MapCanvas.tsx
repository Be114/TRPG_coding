import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva'
import Konva from 'konva'
import { useMapStore } from '@/stores/mapStore'
import { MapObject } from '@/types'

interface MapCanvasProps {
  width: number
  height: number
}

export function MapCanvas({ width, height }: MapCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width, height })
  const isDrawing = useRef(false)
  const lastLine = useRef<any>(null)

  const {
    currentMap,
    editorState,
    setIsDrawing,
    setPan,
    setZoom,
    updateLayer,
    autoSave,
  } = useMapStore()

  useEffect(() => {
    setStageSize({ width, height })
  }, [width, height])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    stage.scale({ x: editorState.zoom, y: editorState.zoom })
    stage.position({ x: editorState.panX, y: editorState.panY })
    stage.batchDraw()
  }, [editorState.zoom, editorState.panX, editorState.panY])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!currentMap || !editorState.selectedLayer) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Adjust position based on zoom and pan
    const adjustedPos = {
      x: (pos.x - editorState.panX) / editorState.zoom,
      y: (pos.y - editorState.panY) / editorState.zoom,
    }

    if (editorState.selectedTool.type === 'pen' || editorState.selectedTool.type === 'brush') {
      isDrawing.current = true
      setIsDrawing(true)

      const selectedLayer = currentMap.data.layers.find(l => l.id === editorState.selectedLayer)
      if (!selectedLayer) return

      const newLine: MapObject = {
        id: `line-${Date.now()}`,
        type: 'shape',
        x: adjustedPos.x,
        y: adjustedPos.y,
        width: 0,
        height: 0,
        rotation: 0,
        data: {
          tool: editorState.selectedTool.type,
          points: [adjustedPos.x, adjustedPos.y],
          color: editorState.selectedTool.color,
          size: editorState.selectedTool.size,
          opacity: editorState.selectedTool.opacity,
        },
      }

      lastLine.current = newLine
      updateLayer(selectedLayer.id, {
        objects: [...selectedLayer.objects, newLine],
      })
    }
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!currentMap || !editorState.selectedLayer || !isDrawing.current) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const adjustedPos = {
      x: (pos.x - editorState.panX) / editorState.zoom,
      y: (pos.y - editorState.panY) / editorState.zoom,
    }

    if (editorState.selectedTool.type === 'pen' || editorState.selectedTool.type === 'brush') {
      const selectedLayer = currentMap.data.layers.find(l => l.id === editorState.selectedLayer)
      if (!selectedLayer || !lastLine.current) return

      const updatedLine = {
        ...lastLine.current,
        data: {
          ...lastLine.current.data,
          points: [...lastLine.current.data.points, adjustedPos.x, adjustedPos.y],
        },
      }

      lastLine.current = updatedLine

      updateLayer(selectedLayer.id, {
        objects: selectedLayer.objects.map(obj =>
          obj.id === lastLine.current.id ? updatedLine : obj
        ),
      })
    }
  }

  const handleMouseUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false
      setIsDrawing(false)
      lastLine.current = null
      autoSave()
    }
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const stage = e.target.getStage()
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const factor = 1.1
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor

    setZoom(Math.max(0.1, Math.min(5, newScale)))

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    setPan(newPos.x, newPos.y)
  }

  const renderGrid = () => {
    if (!currentMap?.data.settings.gridVisible) return null

    const { gridSize, settings } = currentMap.data
    const { width, height } = currentMap.data

    const lines = []
    const gridColor = settings.gridColor

    // Vertical lines
    for (let i = 0; i <= width; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, height * gridSize]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={0.5}
        />
      )
    }

    // Horizontal lines
    for (let i = 0; i <= height; i++) {
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

    return lines
  }

  const renderMapObjects = (objects: MapObject[]) => {
    return objects.map(obj => {
      switch (obj.type) {
        case 'shape':
          if (obj.data.tool === 'pen' || obj.data.tool === 'brush') {
            return (
              <Line
                key={obj.id}
                points={obj.data.points}
                stroke={obj.data.color}
                strokeWidth={obj.data.size}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={obj.data.opacity}
              />
            )
          }
          break
        case 'text':
          return (
            <Text
              key={obj.id}
              x={obj.x}
              y={obj.y}
              text={obj.data.text}
              fontSize={obj.data.fontSize || 16}
              fill={obj.data.color || '#000000'}
              rotation={obj.rotation}
              opacity={obj.data.opacity || 1}
            />
          )
        default:
          return null
      }
      return null
    })
  }

  if (!currentMap) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <p className="text-gray-500">マップが選択されていません</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden bg-white">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onWheel={handleWheel}
        draggable={editorState.selectedTool.type === 'select'}
      >
        {/* Background layer */}
        <Layer>
          <Rect
            x={0}
            y={0}
            width={currentMap.data.width * currentMap.data.gridSize}
            height={currentMap.data.height * currentMap.data.gridSize}
            fill={currentMap.data.settings.backgroundColor}
          />
        </Layer>

        {/* Grid layer */}
        <Layer>
          {renderGrid()}
        </Layer>

        {/* Map layers */}
        {currentMap.data.layers
          .filter(layer => layer.visible)
          .map(layer => (
            <Layer
              key={layer.id}
              opacity={layer.opacity}
            >
              {renderMapObjects(layer.objects)}
            </Layer>
          ))
        }
      </Stage>
    </div>
  )
}