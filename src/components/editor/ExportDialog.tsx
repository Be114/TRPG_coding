import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useScenarioStore } from '@/stores/scenarioStore'
import { Download, FileText, Code, File } from 'lucide-react'

interface ExportDialogProps {
  trigger: React.ReactNode
}

export function ExportDialog({ trigger }: ExportDialogProps) {
  const { currentScenario, chapters } = useScenarioStore()
  const [isExporting, setIsExporting] = useState(false)

  const exportAsMarkdown = () => {
    if (!currentScenario) return

    setIsExporting(true)
    
    try {
      let content = `# ${currentScenario.title}\n\n`
      
      // Add main scenario content if it exists
      if (currentScenario.content && currentScenario.content.content?.length > 0) {
        content += convertTipTapToMarkdown(currentScenario.content) + '\n\n'
      }

      // Add chapters
      const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex)
      
      for (const chapter of sortedChapters) {
        const level = chapter.parentId ? '##' : '#'
        content += `${level} ${chapter.title}\n\n`
        
        if (chapter.content && chapter.content.content?.length > 0) {
          content += convertTipTapToMarkdown(chapter.content) + '\n\n'
        }
      }

      downloadFile(content, `${currentScenario.title}.md`, 'text/markdown')
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsHTML = () => {
    if (!currentScenario) return

    setIsExporting(true)
    
    try {
      let content = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentScenario.title}</title>
  <style>
    body { font-family: 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    .chapter { margin-bottom: 3rem; }
    .metadata { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>${currentScenario.title}</h1>
  <div class="metadata">
    <p>作成日: ${new Date(currentScenario.createdAt).toLocaleDateString('ja-JP')}</p>
    <p>最終更新: ${new Date(currentScenario.lastEditedAt).toLocaleDateString('ja-JP')}</p>
    <p>文字数: ${currentScenario.wordCount.toLocaleString()}</p>
  </div>
`

      // Add main scenario content
      if (currentScenario.content && currentScenario.content.content?.length > 0) {
        content += `  <div class="chapter">
    ${convertTipTapToHTML(currentScenario.content)}
  </div>
`
      }

      // Add chapters
      const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex)
      
      for (const chapter of sortedChapters) {
        const level = chapter.parentId ? 'h3' : 'h2'
        content += `  <div class="chapter">
    <${level}>${chapter.title}</${level}>
    ${chapter.content && chapter.content.content?.length > 0 ? convertTipTapToHTML(chapter.content) : ''}
  </div>
`
      }

      content += `</body>
</html>`

      downloadFile(content, `${currentScenario.title}.html`, 'text/html')
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsJSON = () => {
    if (!currentScenario) return

    setIsExporting(true)
    
    try {
      const exportData = {
        scenario: currentScenario,
        chapters: chapters.sort((a, b) => a.orderIndex - b.orderIndex),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      }

      const content = JSON.stringify(exportData, null, 2)
      downloadFile(content, `${currentScenario.title}.json`, 'application/json')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const convertTipTapToMarkdown = (content: any): string => {
    if (!content || !content.content) return ''
    
    return content.content.map((node: any) => {
      switch (node.type) {
        case 'heading':
          const level = '#'.repeat(node.attrs.level)
          return `${level} ${getTextContent(node)}\n`
        case 'paragraph':
          return `${getTextContent(node)}\n`
        case 'bulletList':
          return node.content.map((item: any) => `- ${getTextContent(item)}`).join('\n') + '\n'
        case 'orderedList':
          return node.content.map((item: any, index: number) => `${index + 1}. ${getTextContent(item)}`).join('\n') + '\n'
        case 'blockquote':
          return `> ${getTextContent(node)}\n`
        case 'codeBlock':
          return `\`\`\`\n${getTextContent(node)}\n\`\`\`\n`
        case 'horizontalRule':
          return '---\n'
        default:
          return getTextContent(node) + '\n'
      }
    }).join('\n')
  }

  const convertTipTapToHTML = (content: any): string => {
    if (!content || !content.content) return ''
    
    return content.content.map((node: any) => {
      switch (node.type) {
        case 'heading':
          const level = node.attrs.level
          return `<h${level}>${getTextContent(node)}</h${level}>`
        case 'paragraph':
          return `<p>${getTextContent(node)}</p>`
        case 'bulletList':
          const items = node.content.map((item: any) => `<li>${getTextContent(item)}</li>`).join('')
          return `<ul>${items}</ul>`
        case 'orderedList':
          const orderedItems = node.content.map((item: any) => `<li>${getTextContent(item)}</li>`).join('')
          return `<ol>${orderedItems}</ol>`
        case 'blockquote':
          return `<blockquote><p>${getTextContent(node)}</p></blockquote>`
        case 'codeBlock':
          return `<pre><code>${getTextContent(node)}</code></pre>`
        case 'horizontalRule':
          return '<hr>'
        default:
          return `<p>${getTextContent(node)}</p>`
      }
    }).join('')
  }

  const getTextContent = (node: any): string => {
    if (node.text) return node.text
    if (node.content) {
      return node.content.map((child: any) => getTextContent(child)).join('')
    }
    return ''
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>エクスポート</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportAsMarkdown}
              disabled={isExporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              Markdown (.md)
            </Button>
            
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportAsHTML}
              disabled={isExporting}
            >
              <Code className="h-4 w-4 mr-2" />
              HTML (.html)
            </Button>
            
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportAsJSON}
              disabled={isExporting}
            >
              <File className="h-4 w-4 mr-2" />
              JSON (.json)
            </Button>
          </div>
          
          {isExporting && (
            <div className="text-sm text-muted-foreground text-center">
              エクスポート中...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}