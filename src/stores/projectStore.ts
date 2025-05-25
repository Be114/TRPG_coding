import { create } from 'zustand'
import { Project } from '@/types'
import { supabase } from '@/lib/supabase'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  createProject: (title: string, description?: string) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const projects: Project[] = data.map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        userId: project.user_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        thumbnailUrl: project.thumbnail_url,
      }))

      set({ projects, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createProject: async (title: string, description = '') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('projects')
      .insert({
        title,
        description,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    const project: Project = {
      id: data.id,
      title: data.title,
      description: data.description,
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      thumbnailUrl: data.thumbnail_url,
    }

    set(state => ({ projects: [project, ...state.projects] }))
    return project
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update({
        title: updates.title,
        description: updates.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    set(state => ({
      projects: state.projects.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
      currentProject: state.currentProject?.id === id
        ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
        : state.currentProject,
    }))
  },

  deleteProject: async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }))
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project })
  },
}))