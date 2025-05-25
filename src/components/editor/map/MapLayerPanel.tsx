import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMapStore } from '@/stores/mapStore'
import { MapLayer } from '@/types'

export function MapLayerPanel() {
  const {
    currentMap,
    editorState,
    setSelectedLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
  } = useMapStore()

  const [editingLayer, setEditingLayer] = useState<string | null>(null)
  const [layerName, setLayerName] = useState('')

  if (!currentMap) return null

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayer(layerId)
  }

  const handleAddLayer = () => {
    const layerNumber = currentMap.data.layers.length + 1
    const newLayer: Omit<MapLayer, 'id'> = {
      name: `新しいレイヤー ${layerNumber}`,
      type: 'objects',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      objects: [],
    }
    addLayer(newLayer)
  }

  const handleToggleVisibility = (layerId: string, currentVisibility: boolean) => {
    updateLayer(layerId, { visible: !currentVisibility })
  }

  const handleToggleLock = (layerId: string, currentLocked: boolean) => {
    updateLayer(layerId, { locked: !currentLocked })
  }

  const handleOpacityChange = (layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity: opacity / 100 })
  }

  const handleStartEditing = (layerId: string, currentName: string) => {
    setEditingLayer(layerId)
    setLayerName(currentName)
  }

  const handleFinishEditing = () => {
    if (editingLayer && layerName.trim()) {
      updateLayer(editingLayer, { name: layerName.trim() })
    }
    setEditingLayer(null)
    setLayerName('')
  }

  const handleDeleteLayer = (layerId: string) => {
    if (currentMap.data.layers.length > 1) {
      deleteLayer(layerId)
    }
  }

  const getLayerIcon = (type: MapLayer['type']) => {
    switch (type) {
      case 'background':
        return '🌄'
      case 'objects':
        return '🏠'
      case 'tokens':
        return '👤'
      case 'effects':
        return '✨'
      case 'gm':
        return '👁️'
      default:
        return '📋'
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">レイヤー</h3>
          <Button
            size="sm"
            onClick={handleAddLayer}
            className="w-8 h-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {currentMap.data.layers
          .slice()
          .reverse()
          .map((layer, index) => (
            <div
              key={layer.id}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                editorState.selectedLayer === layer.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleLayerSelect(layer.id)}
            >
              <div className="flex items-center gap-2">
                {/* Drag Handle */}
                <div className="cursor-grab">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>

                {/* Layer Icon */}
                <span className="text-sm">
                  {getLayerIcon(layer.type)}
                </span>

                {/* Layer Name */}
                <div className="flex-1">
                  {editingLayer === layer.id ? (
                    <Input
                      value={layerName}
                      onChange={(e) => setLayerName(e.target.value)}
                      onBlur={handleFinishEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishEditing()
                        if (e.key === 'Escape') {
                          setEditingLayer(null)
                          setLayerName('')
                        }
                      }}
                      className="h-6 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-sm font-medium"
                      onDoubleClick={() => handleStartEditing(layer.id, layer.name)}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Layer Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleVisibility(layer.id, layer.visible)
                    }}
                    className="w-6 h-6 p-0"
                  >
                    {layer.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleLock(layer.id, layer.locked)
                    }}
                    className="w-6 h-6 p-0"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3 text-gray-400" />
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 p-0"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStartEditing(layer.id, layer.name)}
                      >
                        名前を変更
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const duplicatedLayer: Omit<MapLayer, 'id'> = {
                            ...layer,
                            name: `${layer.name} (コピー)`,
                          }
                          addLayer(duplicatedLayer)
                        }}
                      >
                        複製
                      </DropdownMenuItem>
                      <Separator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteLayer(layer.id)}
                        disabled={currentMap.data.layers.length <= 1}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">不透明度</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.opacity * 100}
                  onChange={(e) => handleOpacityChange(layer.id, parseInt(e.target.value))}
                  className="flex-1 h-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-gray-500 w-8">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        {currentMap.data.layers.length} レイヤー
      </div>
    </div>
  )
}