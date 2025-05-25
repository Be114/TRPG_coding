import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, Grid, Palette } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'
import { MapData, MapSettings as IMapSettings } from '@/types'

export function MapSettings() {
  const { currentMap, updateMap } = useMapStore()

  if (!currentMap) return null

  const updateMapData = (updates: Partial<MapData>) => {
    const newData = { ...currentMap.data, ...updates }
    updateMap(currentMap.id, { data: newData })
  }

  const updateSettings = (updates: Partial<IMapSettings>) => {
    const newSettings = { ...currentMap.data.settings, ...updates }
    updateMapData({ settings: newSettings })
  }

  const handleSizeChange = (width: number, height: number) => {
    updateMapData({ width, height })
  }

  const handleGridSizeChange = (gridSize: number) => {
    updateMapData({ gridSize })
  }

  const gridSizeOptions = [16, 24, 32, 48, 64, 96, 128]

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <h3 className="font-semibold">マップ設定</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Map Size */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Grid className="w-4 h-4" />
            マップサイズ
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-xs text-gray-600">
                幅 (グリッド)
              </Label>
              <Input
                id="width"
                type="number"
                value={currentMap.data.width}
                onChange={(e) => {
                  const width = parseInt(e.target.value) || 1
                  handleSizeChange(Math.max(1, Math.min(100, width)), currentMap.data.height)
                }}
                min="1"
                max="100"
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-xs text-gray-600">
                高さ (グリッド)
              </Label>
              <Input
                id="height"
                type="number"
                value={currentMap.data.height}
                onChange={(e) => {
                  const height = parseInt(e.target.value) || 1
                  handleSizeChange(currentMap.data.width, Math.max(1, Math.min(100, height)))
                }}
                min="1"
                max="100"
                className="h-8"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Grid Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">グリッド設定</Label>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="grid-visible" className="text-sm">
              グリッド表示
            </Label>
            <Switch
              id="grid-visible"
              checked={currentMap.data.settings.gridVisible}
              onCheckedChange={(checked) => updateSettings({ gridVisible: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">グリッドサイズ (px)</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-8">
                  {currentMap.data.gridSize}px
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {gridSizeOptions.map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => handleGridSizeChange(size)}
                  >
                    {size}px
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">グリッド色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentMap.data.settings.gridColor}
                onChange={(e) => updateSettings({ gridColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300"
              />
              <Input
                value={currentMap.data.settings.gridColor}
                onChange={(e) => updateSettings({ gridColor: e.target.value })}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="snap-to-grid" className="text-sm">
              グリッドにスナップ
            </Label>
            <Switch
              id="snap-to-grid"
              checked={currentMap.data.settings.snapToGrid}
              onCheckedChange={(checked) => updateSettings({ snapToGrid: checked })}
            />
          </div>
        </div>

        <Separator />

        {/* Background Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Palette className="w-4 h-4" />
            背景設定
          </Label>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">背景色</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentMap.data.settings.backgroundColor}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300"
              />
              <Input
                value={currentMap.data.settings.backgroundColor}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Grid Type (Future feature) */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">グリッドタイプ</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="square-grid"
                name="gridType"
                checked={currentMap.data.settings.gridType === 'square'}
                onChange={() => updateSettings({ gridType: 'square' })}
              />
              <Label htmlFor="square-grid" className="text-sm">
                正方形
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="hex-grid"
                name="gridType"
                checked={currentMap.data.settings.gridType === 'hex'}
                onChange={() => updateSettings({ gridType: 'hex' })}
                disabled
              />
              <Label htmlFor="hex-grid" className="text-sm text-gray-400">
                六角形 (実装予定)
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        {currentMap.data.width} × {currentMap.data.height} グリッド
        <br />
        {currentMap.data.width * currentMap.data.gridSize} × {currentMap.data.height * currentMap.data.gridSize} ピクセル
      </div>
    </div>
  )
}