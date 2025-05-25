import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useScenarioStore } from '@/stores/scenarioStore'
import { History, RotateCcw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface VersionHistoryProps {
  scenarioId: string
}

interface Version {
  id: string
  content: any
  timestamp: string
  version: number
  wordCount: number
}

export function VersionHistory({ scenarioId }: VersionHistoryProps) {
  const { currentScenario, updateScenarioContent } = useScenarioStore()
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock version history - in a real app, this would come from the database
  useEffect(() => {
    if (currentScenario) {
      // Generate some mock versions for demonstration
      const now = new Date()
      const mockVersions: Version[] = [
        {
          id: '1',
          content: currentScenario.content,
          timestamp: now.toISOString(),
          version: currentScenario.version,
          wordCount: currentScenario.wordCount,
        },
        {
          id: '2',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '以前のバージョンの内容...' }] }] },
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          version: currentScenario.version - 1,
          wordCount: Math.floor(currentScenario.wordCount * 0.8),
        },
        {
          id: '3',
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'さらに前のバージョン...' }] }] },
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          version: currentScenario.version - 2,
          wordCount: Math.floor(currentScenario.wordCount * 0.6),
        },
      ]
      setVersions(mockVersions)
    }
  }, [currentScenario])

  const restoreVersion = async (version: Version) => {
    if (confirm(`バージョン ${version.version} に復元しますか？現在の変更は失われます。`)) {
      setIsLoading(true)
      try {
        updateScenarioContent(version.content)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getVersionLabel = (version: Version, index: number) => {
    if (index === 0) return '現在のバージョン'
    return `バージョン ${version.version}`
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4" />
          バージョン履歴
        </h3>
      </div>
        
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {versions.map((version, index) => (
            <div
              key={version.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{getVersionLabel(version, index)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(version.timestamp), { 
                      addSuffix: true,
                      locale: ja 
                    })}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{version.wordCount.toLocaleString()} 文字</div>
                  </div>
                  
                  {index !== 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreVersion(version)}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      復元
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Preview of content */}
              <div className="text-sm text-muted-foreground bg-muted/30 rounded p-2 max-h-20 overflow-hidden">
                {getTextPreview(version.content)}
              </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getTextPreview(content: any): string {
  if (!content || !content.content) return '(空のドキュメント)'
  
  const text = content.content
    .map((node: any) => getTextFromNode(node))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

function getTextFromNode(node: any): string {
  if (node.text) return node.text
  if (node.content) {
    return node.content.map((child: any) => getTextFromNode(child)).join('')
  }
  return ''
}