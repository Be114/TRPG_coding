import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceTab {
  id: string
  type: 'scenario' | 'map'
  title: string
  projectId: string
  resourceId: string
  isPinned: boolean
  lastAccessed: Date
  scrollPosition?: number
  cursorPosition?: number
  zoomLevel?: number
  isActive: boolean
}

export interface WorkspaceLayout {
  id: string
  name: string
  splitDirection: 'horizontal' | 'vertical' | 'none'
  splitRatio: number
  leftPanel: WorkspacePanel
  rightPanel?: WorkspacePanel
  createdAt: Date
}

export interface WorkspacePanel {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  width: number
  height: number
}

export interface WorkspaceState {
  // Current state
  currentLayout: WorkspaceLayout | null
  tabs: WorkspaceTab[]
  activeTabId: string | null
  recentlyClosedTabs: WorkspaceTab[]
  
  // Saved workspaces
  savedLayouts: WorkspaceLayout[]
  
  // UI state
  splitDirection: 'horizontal' | 'vertical' | 'none'
  splitRatio: number
  leftPanelWidth: number
  rightPanelWidth: number
  
  // Actions
  openTab: (tab: Omit<WorkspaceTab, 'id' | 'lastAccessed' | 'isActive'>) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  pinTab: (tabId: string) => void
  unpinTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<WorkspaceTab>) => void
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void
  
  // Split view management
  setSplitDirection: (direction: 'horizontal' | 'vertical' | 'none') => void
  setSplitRatio: (ratio: number) => void
  enableSplitView: (direction: 'horizontal' | 'vertical') => void
  disableSplitView: () => void
  
  // Layout management
  saveLayout: (name: string) => void
  loadLayout: (layoutId: string) => void
  deleteLayout: (layoutId: string) => void
  
  // Recently closed tabs
  restoreTab: (tabId: string) => void
  clearRecentlyClosedTabs: () => void
  
  // Utility functions
  getTabsByType: (type: 'scenario' | 'map') => WorkspaceTab[]
  getTabsByProject: (projectId: string) => WorkspaceTab[]
  getActiveTab: () => WorkspaceTab | null
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentLayout: null,
      tabs: [],
      activeTabId: null,
      recentlyClosedTabs: [],
      savedLayouts: [],
      splitDirection: 'none',
      splitRatio: 0.5,
      leftPanelWidth: 50,
      rightPanelWidth: 50,

      openTab: (tabData) => {
        const { tabs, activeTabId } = get()
        
        // Check if tab already exists
        const existingTab = tabs.find(
          tab => tab.type === tabData.type && tab.resourceId === tabData.resourceId
        )
        
        if (existingTab) {
          // Activate existing tab
          set({
            activeTabId: existingTab.id,
            tabs: tabs.map(tab => ({
              ...tab,
              isActive: tab.id === existingTab.id,
              lastAccessed: tab.id === existingTab.id ? new Date() : tab.lastAccessed
            }))
          })
          return
        }
        
        // Create new tab
        const newTab: WorkspaceTab = {
          ...tabData,
          id: generateId(),
          lastAccessed: new Date(),
          isActive: true,
        }
        
        // Deactivate other tabs and add new one
        const updatedTabs = tabs.map(tab => ({ ...tab, isActive: false }))
        updatedTabs.push(newTab)
        
        set({
          tabs: updatedTabs,
          activeTabId: newTab.id,
        })
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId, recentlyClosedTabs } = get()
        const tabToClose = tabs.find(tab => tab.id === tabId)
        
        if (!tabToClose) return
        
        const remainingTabs = tabs.filter(tab => tab.id !== tabId)
        
        // Add to recently closed (max 10 items)
        const updatedRecentlyClosed = [tabToClose, ...recentlyClosedTabs.slice(0, 9)]
        
        // Determine new active tab
        let newActiveTabId = activeTabId
        if (activeTabId === tabId) {
          // Find next tab to activate
          const currentIndex = tabs.findIndex(tab => tab.id === tabId)
          if (remainingTabs.length > 0) {
            const nextIndex = Math.min(currentIndex, remainingTabs.length - 1)
            newActiveTabId = remainingTabs[nextIndex]?.id || null
          } else {
            newActiveTabId = null
          }
        }
        
        // Update active states
        const updatedTabs = remainingTabs.map(tab => ({
          ...tab,
          isActive: tab.id === newActiveTabId
        }))
        
        set({
          tabs: updatedTabs,
          activeTabId: newActiveTabId,
          recentlyClosedTabs: updatedRecentlyClosed,
        })
      },

      setActiveTab: (tabId) => {
        const { tabs } = get()
        const updatedTabs = tabs.map(tab => ({
          ...tab,
          isActive: tab.id === tabId,
          lastAccessed: tab.id === tabId ? new Date() : tab.lastAccessed
        }))
        
        set({
          tabs: updatedTabs,
          activeTabId: tabId,
        })
      },

      pinTab: (tabId) => {
        const { tabs } = get()
        const updatedTabs = tabs.map(tab =>
          tab.id === tabId ? { ...tab, isPinned: true } : tab
        )
        set({ tabs: updatedTabs })
      },

      unpinTab: (tabId) => {
        const { tabs } = get()
        const updatedTabs = tabs.map(tab =>
          tab.id === tabId ? { ...tab, isPinned: false } : tab
        )
        set({ tabs: updatedTabs })
      },

      updateTab: (tabId, updates) => {
        const { tabs } = get()
        const updatedTabs = tabs.map(tab =>
          tab.id === tabId ? { ...tab, ...updates } : tab
        )
        set({ tabs: updatedTabs })
      },

      reorderTabs: (sourceIndex, destinationIndex) => {
        const { tabs } = get()
        const newTabs = [...tabs]
        const [movedTab] = newTabs.splice(sourceIndex, 1)
        newTabs.splice(destinationIndex, 0, movedTab)
        set({ tabs: newTabs })
      },

      setSplitDirection: (direction) => {
        set({ splitDirection: direction })
      },

      setSplitRatio: (ratio) => {
        set({ splitRatio: Math.max(0.1, Math.min(0.9, ratio)) })
      },

      enableSplitView: (direction) => {
        set({
          splitDirection: direction,
          splitRatio: 0.5,
        })
      },

      disableSplitView: () => {
        set({
          splitDirection: 'none',
          splitRatio: 1.0,
        })
      },

      saveLayout: (name) => {
        const { tabs, splitDirection, splitRatio, savedLayouts } = get()
        
        const layout: WorkspaceLayout = {
          id: generateId(),
          name,
          splitDirection,
          splitRatio,
          leftPanel: {
            tabs: tabs.filter(tab => tab.isActive),
            activeTabId: tabs.find(tab => tab.isActive)?.id || null,
            width: splitDirection === 'vertical' ? splitRatio * 100 : 100,
            height: splitDirection === 'horizontal' ? splitRatio * 100 : 100,
          },
          rightPanel: splitDirection !== 'none' ? {
            tabs: [],
            activeTabId: null,
            width: splitDirection === 'vertical' ? (1 - splitRatio) * 100 : 100,
            height: splitDirection === 'horizontal' ? (1 - splitRatio) * 100 : 100,
          } : undefined,
          createdAt: new Date(),
        }
        
        set({
          savedLayouts: [...savedLayouts, layout],
          currentLayout: layout,
        })
      },

      loadLayout: (layoutId) => {
        const { savedLayouts } = get()
        const layout = savedLayouts.find(l => l.id === layoutId)
        
        if (layout) {
          set({
            currentLayout: layout,
            splitDirection: layout.splitDirection,
            splitRatio: layout.splitRatio,
            tabs: layout.leftPanel.tabs,
            activeTabId: layout.leftPanel.activeTabId,
          })
        }
      },

      deleteLayout: (layoutId) => {
        const { savedLayouts } = get()
        set({
          savedLayouts: savedLayouts.filter(l => l.id !== layoutId),
        })
      },

      restoreTab: (tabId) => {
        const { recentlyClosedTabs } = get()
        const tab = recentlyClosedTabs.find(t => t.id === tabId)
        
        if (tab) {
          get().openTab({
            type: tab.type,
            title: tab.title,
            projectId: tab.projectId,
            resourceId: tab.resourceId,
            isPinned: tab.isPinned,
            scrollPosition: tab.scrollPosition,
            cursorPosition: tab.cursorPosition,
            zoomLevel: tab.zoomLevel,
          })
          
          set({
            recentlyClosedTabs: recentlyClosedTabs.filter(t => t.id !== tabId),
          })
        }
      },

      clearRecentlyClosedTabs: () => {
        set({ recentlyClosedTabs: [] })
      },

      // Utility functions
      getTabsByType: (type) => {
        return get().tabs.filter(tab => tab.type === type)
      },

      getTabsByProject: (projectId) => {
        return get().tabs.filter(tab => tab.projectId === projectId)
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(tab => tab.id === activeTabId) || null
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        savedLayouts: state.savedLayouts,
        recentlyClosedTabs: state.recentlyClosedTabs.slice(0, 5), // Only persist 5 recent tabs
      }),
    }
  )
)