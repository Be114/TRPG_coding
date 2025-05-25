import { useState } from 'react'
import { ScenarioChapter } from '@/types'
import { useScenarioStore } from '@/stores/scenarioStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Edit,
  Trash2,
  Copy,
  Search,
  X,
} from 'lucide-react'

interface ChapterTreeProps {
  chapters: ScenarioChapter[]
  selectedChapter: ScenarioChapter | null
  onChapterSelect: (chapterId: string | null) => void
  scenarioId: string
}

interface ChapterNodeProps {
  chapter: ScenarioChapter
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onSaveEdit: (newTitle: string) => void
  onCancelEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onAddChild: () => void
  children?: ChapterNodeProps[]
}

function ChapterNode({
  chapter,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  onAddChild,
  children = [],
}: ChapterNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editTitle, setEditTitle] = useState(chapter.title)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit(editTitle)
    } else if (e.key === 'Escape') {
      setEditTitle(chapter.title)
      onCancelEdit()
    }
  }

  const hasChildren = children.length > 0

  return (
    <div className="select-none">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/50 ${
              isSelected ? 'bg-accent text-accent-foreground' : ''
            }`}
            onClick={onSelect}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}
            
            <FileText className="h-4 w-4 text-muted-foreground" />
            
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => onSaveEdit(editTitle)}
                className="h-6 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{chapter.title}</span>
            )}
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <ContextMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            名前を変更
          </ContextMenuItem>
          <ContextMenuItem onClick={onAddChild}>
            <Plus className="h-4 w-4 mr-2" />
            子チャプターを追加
          </ContextMenuItem>
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            複製
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {hasChildren && isExpanded && (
        <div className="ml-4 border-l border-border">
          <div className="ml-2">
            {children.map((child) => (
              <ChapterNode key={child.chapter.id} {...child} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChapterTree({
  chapters,
  selectedChapter,
  onChapterSelect,
  scenarioId,
}: ChapterTreeProps) {
  const { createChapter, updateChapter, deleteChapter } = useScenarioStore()
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)

  // Filter chapters based on search query
  const filteredChapters = searchQuery.trim()
    ? chapters.filter(chapter =>
        chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chapters

  // Build tree structure
  const buildTree = (chapters: ScenarioChapter[]): ScenarioChapter[] => {
    const tree: ScenarioChapter[] = []
    const nodeMap = new Map<string, ScenarioChapter & { children: ScenarioChapter[] }>()

    // First pass: create all nodes
    chapters.forEach(chapter => {
      nodeMap.set(chapter.id, { ...chapter, children: [] })
    })

    // Second pass: build tree structure
    chapters.forEach(chapter => {
      const node = nodeMap.get(chapter.id)!
      if (chapter.parentId) {
        const parent = nodeMap.get(chapter.parentId)
        if (parent) {
          parent.children.push(node)
        } else {
          tree.push(node) // Parent not found, add to root
        }
      } else {
        tree.push(node)
      }
    })

    return tree
  }

  const treeData = buildTree(filteredChapters)

  const handleEdit = (chapterId: string) => {
    setEditingChapterId(chapterId)
  }

  const handleSaveEdit = async (chapterId: string, newTitle: string) => {
    if (newTitle.trim()) {
      await updateChapter(chapterId, { title: newTitle.trim() })
    }
    setEditingChapterId(null)
  }

  const handleCancelEdit = () => {
    setEditingChapterId(null)
  }

  const handleDelete = async (chapterId: string) => {
    if (confirm('このチャプターを削除しますか？')) {
      await deleteChapter(chapterId)
    }
  }

  const handleDuplicate = async (chapter: ScenarioChapter) => {
    await createChapter(`${chapter.title} (コピー)`, chapter.parentId || undefined)
  }

  const handleAddChild = async (parentId: string) => {
    await createChapter('新しいチャプター', parentId)
  }

  const handleAddRoot = async () => {
    await createChapter('新しいチャプター')
  }

  const renderChapterNodes = (chapters: (ScenarioChapter & { children: ScenarioChapter[] })[]): ChapterNodeProps[] => {
    return chapters.map(chapter => ({
      chapter,
      isSelected: selectedChapter?.id === chapter.id,
      isEditing: editingChapterId === chapter.id,
      onSelect: () => onChapterSelect(chapter.id),
      onEdit: () => handleEdit(chapter.id),
      onSaveEdit: (newTitle) => handleSaveEdit(chapter.id, newTitle),
      onCancelEdit: handleCancelEdit,
      onDelete: () => handleDelete(chapter.id),
      onDuplicate: () => handleDuplicate(chapter),
      onAddChild: () => handleAddChild(chapter.id),
      children: renderChapterNodes(chapter.children),
    }))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">チャプター</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="h-6 w-6 p-0"
          >
            <Search className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddRoot}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {isSearchVisible && (
        <div className="p-2 border-b">
          <div className="relative">
            <Input
              placeholder="チャプターを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {treeData.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>チャプターがありません</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRoot}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              最初のチャプターを作成
            </Button>
          </div>
        ) : (
          renderChapterNodes(treeData).map((nodeProps) => (
            <ChapterNode key={nodeProps.chapter.id} {...nodeProps} />
          ))
        )}
      </div>
    </div>
  )
}