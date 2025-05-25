import { create } from 'zustand'
import { Map, MapData, MapLayer, MapEditorState, DrawingTool } from '@/types'
import { supabase } from '@/lib/supabase'

interface MapState {
  maps: Map[]
  currentMap: Map | null
  editorState: MapEditorState
  loading: boolean
  error: string | null
  
  // Map CRUD operations
  fetchMaps: (projectId: string) => Promise<void>
  createMap: (projectId: string, title: string) => Promise<Map>
  updateMap: (id: string, updates: Partial<Map>) => Promise<void>
  deleteMap: (id: string) => Promise<void>
  setCurrentMap: (map: Map | null) => void
  
  // Editor state management
  setSelectedTool: (tool: DrawingTool) => void
  setSelectedLayer: (layerId: string | null) => void
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  setIsDrawing: (isDrawing: boolean) => void
  setSelectedObjects: (objectIds: string[]) => void
  
  // Layer management
  addLayer: (layer: Omit<MapLayer, 'id'>) => void
  updateLayer: (layerId: string, updates: Partial<MapLayer>) => void
  deleteLayer: (layerId: string) => void
  reorderLayers: (sourceIndex: number, destinationIndex: number) => void
  
  // Auto-save functionality
  autoSave: () => Promise<void>
}

const defaultDrawingTool: DrawingTool = {
  type: 'pen',
  size: 4,
  color: '#000000',
  opacity: 1,
}

const defaultEditorState: MapEditorState = {
  selectedTool: defaultDrawingTool,
  selectedLayer: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDrawing: false,
  selectedObjects: [],
}

const createDefaultMapData = (): MapData => ({
  width: 30,
  height: 20,
  gridSize: 32,
  settings: {
    gridType: 'square',
    gridVisible: true,
    gridColor: '#cccccc',
    backgroundColor: '#ffffff',
    snapToGrid: true,
  },
  layers: [
    {
      id: 'background-layer',
      name: '背景',
      type: 'background',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      objects: [],
    },
    {
      id: 'objects-layer',
      name: 'オブジェクト',
      type: 'objects',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      objects: [],
    },
    {
      id: 'tokens-layer',
      name: 'トークン',
      type: 'tokens',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      objects: [],
    },
  ],
})

export const useMapStore = create<MapState>((set, get) => ({
  maps: [],
  currentMap: null,
  editorState: defaultEditorState,
  loading: false,
  error: null,

  fetchMaps: async (projectId: string) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const maps: Map[] = data.map(map => ({
        id: map.id,
        title: map.title,
        data: map.data || createDefaultMapData(),
        projectId: map.project_id,
        thumbnailUrl: map.thumbnail_url,
        createdAt: map.created_at,
        updatedAt: map.updated_at,
      }))

      set({ maps, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createMap: async (projectId: string, title: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const mapData = createDefaultMapData()
    
    const { data, error } = await supabase
      .from('maps')
      .insert({
        title,
        data: mapData,
        project_id: projectId,
      })
      .select()
      .single()

    if (error) throw error

    const map: Map = {
      id: data.id,
      title: data.title,
      data: mapData,
      projectId: data.project_id,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    set(state => ({ maps: [map, ...state.maps] }))
    return map
  },

  updateMap: async (id: string, updates: Partial<Map>) => {
    const { error } = await supabase
      .from('maps')
      .update({
        title: updates.title,
        data: updates.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    set(state => ({
      maps: state.maps.map(m =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
      currentMap: state.currentMap?.id === id
        ? { ...state.currentMap, ...updates, updatedAt: new Date().toISOString() }
        : state.currentMap,
    }))
  },

  deleteMap: async (id: string) => {
    const { error } = await supabase
      .from('maps')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => ({
      maps: state.maps.filter(m => m.id !== id),
      currentMap: state.currentMap?.id === id ? null : state.currentMap,
    }))
  },

  setCurrentMap: (map: Map | null) => {
    set({ 
      currentMap: map,
      editorState: {
        ...defaultEditorState,
        selectedLayer: map?.data.layers[0]?.id || null,
      }
    })
  },

  setSelectedTool: (tool: DrawingTool) => {
    set(state => ({
      editorState: { ...state.editorState, selectedTool: tool }
    }))
  },

  setSelectedLayer: (layerId: string | null) => {
    set(state => ({
      editorState: { ...state.editorState, selectedLayer: layerId }
    }))
  },

  setZoom: (zoom: number) => {
    set(state => ({
      editorState: { ...state.editorState, zoom: Math.max(0.1, Math.min(5, zoom)) }
    }))
  },

  setPan: (panX: number, panY: number) => {
    set(state => ({
      editorState: { ...state.editorState, panX, panY }
    }))
  },

  setIsDrawing: (isDrawing: boolean) => {
    set(state => ({
      editorState: { ...state.editorState, isDrawing }
    }))
  },

  setSelectedObjects: (objectIds: string[]) => {
    set(state => ({
      editorState: { ...state.editorState, selectedObjects: objectIds }
    }))
  },

  addLayer: (layer: Omit<MapLayer, 'id'>) => {
    const { currentMap } = get()
    if (!currentMap) return

    const newLayer: MapLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
    }

    const updatedData = {
      ...currentMap.data,
      layers: [...currentMap.data.layers, newLayer],
    }

    set(state => ({
      currentMap: state.currentMap ? { ...state.currentMap, data: updatedData } : null
    }))
  },

  updateLayer: (layerId: string, updates: Partial<MapLayer>) => {
    const { currentMap } = get()
    if (!currentMap) return

    const updatedData = {
      ...currentMap.data,
      layers: currentMap.data.layers.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ),
    }

    set(state => ({
      currentMap: state.currentMap ? { ...state.currentMap, data: updatedData } : null
    }))
  },

  deleteLayer: (layerId: string) => {
    const { currentMap } = get()
    if (!currentMap) return

    const updatedData = {
      ...currentMap.data,
      layers: currentMap.data.layers.filter(layer => layer.id !== layerId),
    }

    set(state => ({
      currentMap: state.currentMap ? { ...state.currentMap, data: updatedData } : null,
      editorState: {
        ...state.editorState,
        selectedLayer: state.editorState.selectedLayer === layerId 
          ? updatedData.layers[0]?.id || null 
          : state.editorState.selectedLayer
      }
    }))
  },

  reorderLayers: (sourceIndex: number, destinationIndex: number) => {
    const { currentMap } = get()
    if (!currentMap) return

    const layers = [...currentMap.data.layers]
    const [movedLayer] = layers.splice(sourceIndex, 1)
    layers.splice(destinationIndex, 0, movedLayer)

    const updatedData = {
      ...currentMap.data,
      layers,
    }

    set(state => ({
      currentMap: state.currentMap ? { ...state.currentMap, data: updatedData } : null
    }))
  },

  autoSave: async () => {
    const { currentMap, updateMap } = get()
    if (!currentMap) return

    try {
      await updateMap(currentMap.id, { data: currentMap.data })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))