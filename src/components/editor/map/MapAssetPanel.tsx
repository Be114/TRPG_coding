import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  Search,
  Star,
  Grid3X3,
  Home,
  TreePine,
  Shield,
} from 'lucide-react'

interface AssetCategory {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
}

const assetCategories: AssetCategory[] = [
  { id: 'terrain', name: '地形', icon: TreePine },
  { id: 'buildings', name: '建物', icon: Home },
  { id: 'objects', name: 'オブジェクト', icon: Grid3X3 },
  { id: 'tokens', name: 'トークン', icon: Shield },
]

const sampleAssets = [
  { id: '1', name: '草地', category: 'terrain', url: '🌱' },
  { id: '2', name: '石畳', category: 'terrain', url: '🪨' },
  { id: '3', name: '水', category: 'terrain', url: '💧' },
  { id: '4', name: '小屋', category: 'buildings', url: '🏠' },
  { id: '5', name: '城', category: 'buildings', url: '🏰' },
  { id: '6', name: '宝箱', category: 'objects', url: '📦' },
  { id: '7', name: '剣', category: 'objects', url: '⚔️' },
  { id: '8', name: '戦士', category: 'tokens', url: '🛡️' },
  { id: '9', name: '魔法使い', category: 'tokens', url: '🪄' },
]

export function MapAssetPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string>('terrain')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAssets = sampleAssets.filter(asset => {
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAssetDrag = (asset: any) => {
    // This would implement drag-and-drop functionality
    console.log('Dragging asset:', asset.name)
  }

  const handleUpload = () => {
    // This would implement file upload functionality
    console.log('Upload functionality would be implemented here')
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">アセット</h3>
          <Button
            size="sm"
            onClick={handleUpload}
            className="w-8 h-8 p-0"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="アセットを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="justify-start"
          >
            すべて
          </Button>
          {assetCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="justify-start"
            >
              <category.icon className="w-4 h-4 mr-2" />
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="aspect-square border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center"
              draggable
              onDragStart={() => handleAssetDrag(asset)}
              title={asset.name}
            >
              <div className="text-2xl mb-1">{asset.url}</div>
              <div className="text-xs text-center text-gray-600 line-clamp-2">
                {asset.name}
              </div>
            </div>
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>アセットが見つかりません</p>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="p-4 border-t border-gray-200">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={handleUpload}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            画像をドラッグ&ドロップ
            <br />
            またはクリックしてアップロード
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        {filteredAssets.length} アセット
      </div>
    </div>
  )
}