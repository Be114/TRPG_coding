import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  className?: string
}

const presetColors = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#008000', '#800000', '#808080', '#c0c0c0', '#008080',
  '#000080', '#808000', '#ffc0cb', '#ffd700', '#a52a2a',
]

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexValue, setHexValue] = useState(color)

  const handleColorSelect = (selectedColor: string) => {
    onChange(selectedColor)
    setHexValue(selectedColor)
    setIsOpen(false)
  }

  const handleHexChange = (value: string) => {
    setHexValue(value)
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-10 h-10 p-0 border-2 ${className}`}
          style={{ backgroundColor: color }}
        >
          {color === 'transparent' && (
            <Palette className="w-4 h-4 text-gray-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        <div className="space-y-4">
          {/* Color Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">色コード</label>
            <div className="flex gap-2">
              <Input
                value={hexValue}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#000000"
                className="font-mono text-sm"
              />
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300"
              />
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium">プリセット</label>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => handleColorSelect(presetColor)}
                  className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                    color === presetColor
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          {/* Transparent Option */}
          <Button
            variant="outline"
            onClick={() => handleColorSelect('transparent')}
            className="w-full"
          >
            透明
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}