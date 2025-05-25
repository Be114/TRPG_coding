import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Pencil,
  Brush,
  Eraser,
  Square,
  Circle,
  Type,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Save,
  Download,
  Minus,
} from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'
import { DrawingTool } from '@/types'

const toolItems = [
  { type: 'select', icon: Move, label: '選択', shortcut: 'V' },
  { type: 'pen', icon: Pencil, label: 'ペン', shortcut: 'P' },
  { type: 'brush', icon: Brush, label: 'ブラシ', shortcut: 'B' },
  { type: 'eraser', icon: Eraser, label: '消しゴム', shortcut: 'E' },
  { type: 'line', icon: Minus, label: '直線', shortcut: 'L' },
  { type: 'rectangle', icon: Square, label: '矩形', shortcut: 'R' },
  { type: 'circle', icon: Circle, label: '円', shortcut: 'C' },
  { type: 'text', icon: Type, label: 'テキスト', shortcut: 'T' },
] as const

export function MapToolbar() {
  const {
    currentMap,
    editorState,
    setSelectedTool,
    setZoom,
    autoSave,
  } = useMapStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Tool shortcuts
      toolItems.forEach(({ type, shortcut }) => {
        if (e.key.toLowerCase() === shortcut.toLowerCase()) {
          e.preventDefault()
          setSelectedTool({
            ...editorState.selectedTool,
            type,
          })
        }
      })

      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          setZoom(editorState.zoom * 1.2)
        } else if (e.key === '-') {
          e.preventDefault()
          setZoom(editorState.zoom / 1.2)
        } else if (e.key === '0') {
          e.preventDefault()
          setZoom(1)
        }
      }

      // Save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        autoSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editorState.selectedTool, editorState.zoom, setSelectedTool, setZoom, autoSave])

  const handleToolSelect = (toolType: DrawingTool['type']) => {
    setSelectedTool({
      ...editorState.selectedTool,
      type: toolType,
    })
  }

  const handleZoomIn = () => {
    setZoom(editorState.zoom * 1.2)
  }

  const handleZoomOut = () => {
    setZoom(editorState.zoom / 1.2)
  }

  const handleSave = () => {
    autoSave()
  }

  const handleExport = () => {
    // Export functionality will be implemented later
    console.log('Export functionality coming soon')
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        {toolItems.map(({ type, icon: Icon, label, shortcut }) => (
          <Button
            key={type}
            variant={editorState.selectedTool.type === type ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect(type)}
            title={`${label} (${shortcut})`}
            className="w-8 h-8 p-0"
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Tool Settings */}
      <div className="flex items-center gap-2">
        <label className="text-sm">サイズ:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={editorState.selectedTool.size}
          onChange={(e) => {
            setSelectedTool({
              ...editorState.selectedTool,
              size: parseInt(e.target.value),
            })
          }}
          className="w-20"
        />
        <span className="text-sm w-6">{editorState.selectedTool.size}</span>

        <input
          type="color"
          value={editorState.selectedTool.color}
          onChange={(e) => {
            setSelectedTool({
              ...editorState.selectedTool,
              color: e.target.value,
            })
          }}
          className="w-8 h-8 rounded border border-gray-300"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          title="ズームアウト"
          className="w-8 h-8 p-0"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <span className="text-sm px-2 min-w-[60px] text-center">
          {Math.round(editorState.zoom * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          title="ズームイン"
          className="w-8 h-8 p-0"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          title="保存"
          className="w-8 h-8 p-0"
        >
          <Save className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="エクスポート"
          className="w-8 h-8 p-0"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Right side - Map info */}
      <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
        {currentMap && (
          <>
            <span>グリッド: {currentMap.data.gridSize}px</span>
            <span>サイズ: {currentMap.data.width}x{currentMap.data.height}</span>
            <span>ツール: {toolItems.find(t => t.type === editorState.selectedTool.type)?.label}</span>
          </>
        )}
      </div>
    </div>
  )
}