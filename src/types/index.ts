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
  content: string
  projectId: string
  orderIndex: number
  createdAt: string
  updatedAt: string
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