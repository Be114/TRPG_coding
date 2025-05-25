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
  settings: MapSettings
}

export interface MapSettings {
  gridType: 'square' | 'hex'
  gridVisible: boolean
  gridColor: string
  backgroundColor: string
  snapToGrid: boolean
}

export interface MapLayer {
  id: string
  name: string
  type: 'background' | 'objects' | 'tokens' | 'effects' | 'gm'
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: string
  objects: MapObject[]
}

export interface MapObject {
  id: string
  type: 'shape' | 'image' | 'text' | 'wall' | 'door'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  data: any // Specific data for each object type
}

export interface DrawingTool {
  type: 'pen' | 'brush' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'circle' | 'text' | 'wall' | 'door' | 'select'
  size: number
  color: string
  opacity: number
}

export interface MapEditorState {
  selectedTool: DrawingTool
  selectedLayer: string | null
  zoom: number
  panX: number
  panY: number
  isDrawing: boolean
  selectedObjects: string[]
}

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
}