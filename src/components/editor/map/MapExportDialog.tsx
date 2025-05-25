import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Download, FileImage, FileText, Code } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  extension: string
}

const exportFormats: ExportFormat[] = [
  {
    id: 'png',
    name: 'PNG画像',
    description: '高品質な画像ファイル',
    icon: FileImage,
    extension: 'png',
  },
  {
    id: 'json',
    name: 'JSONデータ',
    description: 'マップデータのバックアップ',
    icon: Code,
    extension: 'json',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'テキスト形式の説明',
    icon: FileText,
    extension: 'md',
  },
]

export function MapExportDialog({ children }: { children: React.ReactNode }) {
  const { currentMap } = useMapStore()
  const [selectedFormat, setSelectedFormat] = useState('png')
  const [filename, setFilename] = useState('')
  const [quality, setQuality] = useState(100)
  const [isExporting, setIsExporting] = useState(false)

  React.useEffect(() => {
    if (currentMap) {
      setFilename(currentMap.title.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_'))
    }
  }, [currentMap])

  const handleExport = async () => {
    if (!currentMap) return

    setIsExporting(true)
    try {
      const format = exportFormats.find(f => f.id === selectedFormat)
      if (!format) return

      switch (selectedFormat) {
        case 'json':
          await exportJSON()
          break
        case 'png':
          await exportPNG()
          break
        case 'markdown':
          await exportMarkdown()
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportJSON = async () => {
    if (!currentMap) return

    const dataStr = JSON.stringify(currentMap.data, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    downloadBlob(blob, `${filename}.json`)
  }

  const exportPNG = async () => {
    // This would require canvas-to-blob conversion
    // For now, just show a placeholder
    console.log('PNG export would be implemented with canvas.toBlob()')
    
    // Placeholder implementation
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 800, 600)
      ctx.fillStyle = '#000000'
      ctx.font = '20px Arial'
      ctx.fillText('Map Export (Implementation Needed)', 50, 50)
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${filename}.png`)
      }
    }, 'image/png', quality / 100)
  }

  const exportMarkdown = async () => {
    if (!currentMap) return

    const markdown = `# ${currentMap.title}

## マップ情報
- サイズ: ${currentMap.data.width} × ${currentMap.data.height} グリッド
- グリッドサイズ: ${currentMap.data.gridSize}px
- 作成日時: ${new Date(currentMap.createdAt).toLocaleDateString('ja-JP')}
- 更新日時: ${new Date(currentMap.updatedAt).toLocaleDateString('ja-JP')}

## レイヤー
${currentMap.data.layers.map(layer => `- ${layer.name} (${layer.type})`).join('\n')}

## 設定
- グリッド表示: ${currentMap.data.settings.gridVisible ? '有効' : '無効'}
- 背景色: ${currentMap.data.settings.backgroundColor}
- グリッド色: ${currentMap.data.settings.gridColor}
`

    const blob = new Blob([markdown], { type: 'text/markdown' })
    downloadBlob(blob, `${filename}.md`)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!currentMap) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            マップをエクスポート
          </DialogTitle>
          <DialogDescription>
            マップを様々な形式でエクスポートできます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">ファイル名</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="ファイル名を入力"
            />
          </div>

          <Separator />

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>エクスポート形式</Label>
            <div className="space-y-2">
              {exportFormats.map((format) => (
                <div
                  key={format.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <div className="flex items-center gap-3">
                    <format.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{format.name}</div>
                      <div className="text-sm text-gray-600">{format.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PNG Quality Settings */}
          {selectedFormat === 'png' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="quality">画質 ({quality}%)</Label>
                <input
                  id="quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          <Separator />

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={!filename.trim() || isExporting}
            className="w-full"
          >
            {isExporting ? (
              'エクスポート中...'
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}