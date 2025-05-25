export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export interface Project {
  id: string
  title: string
  description: string | null
  userId: string
  createdAt: string
  updatedAt: string
  thumbnailUrl: string | null
}

export interface Scenario {
  id: string
  title: string
  content: any // TipTap JSON content
  projectId: string
  orderIndex: number
  wordCount: number
  lastEditedAt: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ScenarioChapter {
  id: string
  title: string
  content: any // TipTap JSON content
  scenarioId: string
  orderIndex: number
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface EditorState {
  focusMode: boolean
  zenMode: boolean
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  leftSidebarWidth: number
  rightSidebarWidth: number
}

export interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: string | null
}

export interface Map {
  id: string
  title: string
  data: MapData
  projectId: string
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface MapData {
  width: number
  height: number
  gridSize: number
  layers: MapLayer[]
}

export interface MapLayer {
  id: string
  name: string
  type: 'background' | 'objects' | 'grid'
  visible: boolean
  opacity: number
  cells: MapCell[][]
}

export interface MapCell {
  color: string | null
  terrain?: string
}

export interface DrawingTool {
  type: 'pen' | 'eraser' | 'fill' | 'select'
  size: number
  color: string
}