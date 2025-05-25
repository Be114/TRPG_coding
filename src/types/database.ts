export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          user_id: string
          thumbnail_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          user_id: string
          thumbnail_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          user_id?: string
          thumbnail_url?: string | null
        }
      }
      scenarios: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          content: any
          project_id: string
          order_index: number
          word_count: number
          last_edited_at: string
          version: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          content?: any
          project_id: string
          order_index?: number
          word_count?: number
          last_edited_at?: string
          version?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          content?: any
          project_id?: string
          order_index?: number
          word_count?: number
          last_edited_at?: string
          version?: number
        }
      }
      scenario_chapters: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          content: any
          scenario_id: string
          order_index: number
          parent_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          content?: any
          scenario_id: string
          order_index?: number
          parent_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          content?: any
          scenario_id?: string
          order_index?: number
          parent_id?: string | null
        }
      }
      maps: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          data: any
          project_id: string
          thumbnail_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          data?: any
          project_id: string
          thumbnail_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          data?: any
          project_id?: string
          thumbnail_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}