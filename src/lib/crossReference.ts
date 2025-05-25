import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

export interface CrossReference {
  id: string
  type: 'map' | 'scenario' | 'chapter'
  title: string
  projectId: string
  targetId: string
  preview?: string
}

export interface CrossReferenceDatabase {
  maps: Map<string, CrossReference>
  scenarios: Map<string, CrossReference>
  chapters: Map<string, CrossReference>
}

class CrossReferenceManager {
  private static instance: CrossReferenceManager
  private database: CrossReferenceDatabase = {
    maps: new Map(),
    scenarios: new Map(),
    chapters: new Map()
  }

  static getInstance(): CrossReferenceManager {
    if (!CrossReferenceManager.instance) {
      CrossReferenceManager.instance = new CrossReferenceManager()
    }
    return CrossReferenceManager.instance
  }

  // Register references
  registerMap(id: string, title: string, projectId: string, preview?: string) {
    this.database.maps.set(id, {
      id,
      type: 'map',
      title,
      projectId,
      targetId: id,
      preview
    })
  }

  registerScenario(id: string, title: string, projectId: string, preview?: string) {
    this.database.scenarios.set(id, {
      id,
      type: 'scenario',
      title,
      projectId,
      targetId: id,
      preview
    })
  }

  registerChapter(id: string, title: string, projectId: string, scenarioId: string, preview?: string) {
    this.database.chapters.set(id, {
      id,
      type: 'chapter',
      title,
      projectId,
      targetId: scenarioId,
      preview
    })
  }

  // Get references
  getReference(type: 'map' | 'scenario' | 'chapter', id: string): CrossReference | undefined {
    return this.database[`${type}s` as keyof CrossReferenceDatabase].get(id)
  }

  // Search references
  searchReferences(query: string, projectId: string): CrossReference[] {
    const results: CrossReference[] = []
    const lowerQuery = query.toLowerCase()

    for (const ref of this.database.maps.values()) {
      if (ref.projectId === projectId && ref.title.toLowerCase().includes(lowerQuery)) {
        results.push(ref)
      }
    }

    for (const ref of this.database.scenarios.values()) {
      if (ref.projectId === projectId && ref.title.toLowerCase().includes(lowerQuery)) {
        results.push(ref)
      }
    }

    for (const ref of this.database.chapters.values()) {
      if (ref.projectId === projectId && ref.title.toLowerCase().includes(lowerQuery)) {
        results.push(ref)
      }
    }

    return results
  }

  // Get all references for a project
  getProjectReferences(projectId: string): CrossReference[] {
    const results: CrossReference[] = []

    for (const ref of this.database.maps.values()) {
      if (ref.projectId === projectId) results.push(ref)
    }

    for (const ref of this.database.scenarios.values()) {
      if (ref.projectId === projectId) results.push(ref)
    }

    for (const ref of this.database.chapters.values()) {
      if (ref.projectId === projectId) results.push(ref)
    }

    return results
  }

  // Generate reference link
  generateLink(type: 'map' | 'scenario', id: string, title?: string): string {
    const displayTitle = title || this.getReference(type, id)?.title || id
    return `[[${type}:${id}|${displayTitle}]]`
  }

  // Parse reference links in text
  parseReferences(text: string): Array<{ match: string; type: string; id: string; title: string }> {
    const referenceRegex = /\[\[(map|scenario|chapter):([a-zA-Z0-9-]+)(?:\|([^\]]+))?\]\]/g
    const matches: Array<{ match: string; type: string; id: string; title: string }> = []
    
    let match
    while ((match = referenceRegex.exec(text)) !== null) {
      matches.push({
        match: match[0],
        type: match[1],
        id: match[2],
        title: match[3] || this.getReference(match[1] as any, match[2])?.title || match[2]
      })
    }
    
    return matches
  }

  // Generate URL for reference
  generateURL(ref: CrossReference): string {
    const base = `/project/${ref.projectId}`
    
    switch (ref.type) {
      case 'map':
        return `${base}/map/${ref.targetId}`
      case 'scenario':
        return `${base}/scenario/${ref.targetId}`
      case 'chapter':
        return `${base}/scenario/${ref.targetId}#chapter-${ref.id}`
      default:
        return base
    }
  }
}

// TipTap extension for cross-references
export const CrossReferenceExtension = Node.create({
  name: 'crossReference',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      type: {
        default: null,
      },
      id: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-cross-reference]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-cross-reference': true }, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CrossReferenceComponent as any)
  },
})

// React component for cross-reference rendering
import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Map, FileText, BookOpen } from 'lucide-react'

interface CrossReferenceComponentProps {
  node: {
    attrs: {
      type: string
      id: string
      title: string
    }
  }
  updateAttributes: (attributes: any) => void
}

const CrossReferenceComponent: React.FC<CrossReferenceComponentProps> = ({ node, updateAttributes }) => {
  const { type, id, title } = node.attrs
  const manager = CrossReferenceManager.getInstance()
  const ref = manager.getReference(type as any, id)

  const getIcon = () => {
    switch (type) {
      case 'map': return <Map className="w-3 h-3" />
      case 'scenario': return <BookOpen className="w-3 h-3" />
      case 'chapter': return <FileText className="w-3 h-3" />
      default: return <ExternalLink className="w-3 h-3" />
    }
  }

  const handleClick = () => {
    if (ref) {
      const url = manager.generateURL(ref)
      window.open(url, '_blank')
    }
  }

  return (
    <NodeViewWrapper className="inline">
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 py-0 text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-accent"
        onClick={handleClick}
      >
        {getIcon()}
        <span>{title || id}</span>
        <ExternalLink className="w-2 h-2 opacity-50" />
      </Button>
    </NodeViewWrapper>
  )
}

// Utility functions
export const useCrossReference = () => {
  const manager = CrossReferenceManager.getInstance()
  
  return {
    manager,
    generateLink: manager.generateLink.bind(manager),
    searchReferences: manager.searchReferences.bind(manager),
    getProjectReferences: manager.getProjectReferences.bind(manager),
    parseReferences: manager.parseReferences.bind(manager),
  }
}

// Auto-completion for reference links
export interface ReferenceCompletion {
  type: 'map' | 'scenario' | 'chapter'
  id: string
  title: string
  preview?: string
}

export const createReferenceCompletions = (projectId: string): ReferenceCompletion[] => {
  const manager = CrossReferenceManager.getInstance()
  const refs = manager.getProjectReferences(projectId)
  
  return refs.map(ref => ({
    type: ref.type,
    id: ref.id,
    title: ref.title,
    preview: ref.preview
  }))
}