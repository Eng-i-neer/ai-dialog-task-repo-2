import { create } from 'zustand'
import type { MindMapNode, MindMapData, MindMapItem, LayoutType, ConnectionStyle } from '../types'

const DEFAULT_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const MAX_HISTORY_SIZE = 50

interface EditorState extends MindMapData {
  selectedNodeId: number | null
  editingNodeId: number | null
  contextMenuNodeId: number | null
  contextMenuPosition: { x: number; y: number } | null
  currentMindmapId: number | null
  currentMindmapName: string
  isSaving: boolean
  history: MindMapData[]
  historyIndex: number
  
  addCenterNode: () => void
  addChildNode: (parentId: number) => void
  deleteNode: (nodeId: number) => void
  updateNodeText: (nodeId: number, text: string) => void
  toggleNodeChecked: (nodeId: number) => void
  selectNode: (nodeId: number | null) => void
  startEditing: (nodeId: number) => void
  stopEditing: () => void
  showContextMenu: (nodeId: number, x: number, y: number) => void
  hideContextMenu: () => void
  setLayoutType: (type: LayoutType) => void
  setConnectionStyle: (style: ConnectionStyle) => void
  setFontFamily: (font: string) => void
  setCurrentMindmap: (id: number | null, name: string, data?: MindMapData) => void
  newMindMap: () => void
  saveStateToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

interface ProjectsState {
  mindmaps: MindMapItem[]
  isLoading: boolean
  backendConnected: boolean
  error: string | null
  
  loadMindmaps: () => Promise<void>
  setBackendConnected: (connected: boolean) => void
  deleteMindmap: (id: number) => Promise<void>
  renameMindmap: (id: number, name: string) => Promise<void>
}

export const DEFAULT_EMPTY_DATA: MindMapData = {
  nodes: [],
  nextNodeId: 1,
  layoutType: 'right',
  connectionStyle: 'curve',
  fontFamily: DEFAULT_FONT_FAMILY
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...DEFAULT_EMPTY_DATA,
  selectedNodeId: null,
  editingNodeId: null,
  contextMenuNodeId: null,
  contextMenuPosition: null,
  currentMindmapId: null,
  currentMindmapName: '新思维导图',
  isSaving: false,
  history: [],
  historyIndex: -1,

  saveStateToHistory: () => {
    const state = get()
    const currentState: MindMapData = {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      nextNodeId: state.nextNodeId,
      layoutType: state.layoutType,
      connectionStyle: state.connectionStyle,
      fontFamily: state.fontFamily
    }
    
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(currentState)
    
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift()
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex <= 0) return
    
    const prevIndex = state.historyIndex - 1
    const prevState = state.history[prevIndex]
    
    if (prevState) {
      set({
        ...prevState,
        historyIndex: prevIndex,
        selectedNodeId: null,
        editingNodeId: null,
        contextMenuNodeId: null,
        contextMenuPosition: null
      })
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return
    
    const nextIndex = state.historyIndex + 1
    const nextState = state.history[nextIndex]
    
    if (nextState) {
      set({
        ...nextState,
        historyIndex: nextIndex,
        selectedNodeId: null,
        editingNodeId: null,
        contextMenuNodeId: null,
        contextMenuPosition: null
      })
    }
  },

  canUndo: () => {
    return get().historyIndex > 0
  },

  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  addCenterNode: () => {
    const state = get()
    state.saveStateToHistory()
    
    const id = state.nextNodeId
    const node: MindMapNode = {
      id,
      text: '中心节点',
      x: 100,
      y: 100,
      children: [],
      isCenter: true,
      checked: false,
      parentId: null
    }
    
    set({
      nodes: [...state.nodes, node],
      nextNodeId: id + 1
    })
  },

  addChildNode: (parentId: number) => {
    const state = get()
    const parentNode = state.nodes.find(n => n.id === parentId)
    if (!parentNode) return
    
    state.saveStateToHistory()
    
    const id = state.nextNodeId
    const node: MindMapNode = {
      id,
      text: '子节点',
      x: 0,
      y: 0,
      children: [],
      isCenter: false,
      checked: false,
      parentId
    }
    
    const updatedNodes = state.nodes.map(n => 
      n.id === parentId 
        ? { ...n, children: [...n.children, id] }
        : n
    )
    
    set({
      nodes: [...updatedNodes, node],
      nextNodeId: id + 1
    })
  },

  deleteNode: (nodeId: number) => {
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node) return
    
    state.saveStateToHistory()
    
    const nodesToDelete = new Set<number>()
    
    const deleteRecursive = (id: number) => {
      const currentNode = state.nodes.find(n => n.id === id)
      if (currentNode) {
        currentNode.children.forEach(childId => deleteRecursive(childId))
        nodesToDelete.add(id)
      }
    }
    
    deleteRecursive(nodeId)
    
    const updatedNodes = state.nodes
      .filter(n => !nodesToDelete.has(n.id))
      .map(n => ({
        ...n,
        children: n.children.filter(cId => !nodesToDelete.has(cId))
      }))
    
    set({
      nodes: updatedNodes,
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      editingNodeId: state.editingNodeId === nodeId ? null : state.editingNodeId,
      contextMenuNodeId: null,
      contextMenuPosition: null
    })
  },

  updateNodeText: (nodeId: number, text: string) => {
    const state = get()
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node) return
    
    if (node.text !== text) {
      state.saveStateToHistory()
    }
    
    const updatedNodes = state.nodes.map(n =>
      n.id === nodeId ? { ...n, text } : n
    )
    
    set({
      nodes: updatedNodes,
      editingNodeId: null
    })
  },

  toggleNodeChecked: (nodeId: number) => {
    const state = get()
    const updatedNodes = state.nodes.map(n =>
      n.id === nodeId ? { ...n, checked: !n.checked } : n
    )
    
    set({ nodes: updatedNodes })
  },

  selectNode: (nodeId: number | null) => {
    set({ selectedNodeId: nodeId })
  },

  startEditing: (nodeId: number) => {
    set({ editingNodeId: nodeId, selectedNodeId: nodeId })
  },

  stopEditing: () => {
    set({ editingNodeId: null })
  },

  showContextMenu: (nodeId: number, x: number, y: number) => {
    set({
      contextMenuNodeId: nodeId,
      contextMenuPosition: { x, y }
    })
  },

  hideContextMenu: () => {
    set({
      contextMenuNodeId: null,
      contextMenuPosition: null
    })
  },

  setLayoutType: (type: LayoutType) => {
    const state = get()
    if (state.layoutType !== type) {
      state.saveStateToHistory()
      set({ layoutType: type })
    }
  },

  setConnectionStyle: (style: ConnectionStyle) => {
    const state = get()
    if (state.connectionStyle !== style) {
      state.saveStateToHistory()
      set({ connectionStyle: style })
    }
  },

  setFontFamily: (font: string) => {
    const state = get()
    if (state.fontFamily !== font) {
      state.saveStateToHistory()
      set({ fontFamily: font })
    }
  },

  setCurrentMindmap: (id: number | null, name: string, data?: MindMapData) => {
    if (data) {
      set({
        currentMindmapId: id,
        currentMindmapName: name,
        nodes: data.nodes,
        nextNodeId: data.nextNodeId,
        layoutType: data.layoutType,
        connectionStyle: data.connectionStyle,
        fontFamily: data.fontFamily,
        selectedNodeId: null,
        editingNodeId: null,
        contextMenuNodeId: null,
        contextMenuPosition: null,
        history: [{ ...data }],
        historyIndex: 0
      })
    } else {
      set({
        currentMindmapId: id,
        currentMindmapName: name
      })
    }
  },

  newMindMap: () => {
    set({
      ...DEFAULT_EMPTY_DATA,
      selectedNodeId: null,
      editingNodeId: null,
      contextMenuNodeId: null,
      contextMenuPosition: null,
      currentMindmapId: null,
      currentMindmapName: '新思维导图',
      history: [{ ...DEFAULT_EMPTY_DATA }],
      historyIndex: 0
    })
  }
}))

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  mindmaps: [],
  isLoading: false,
  backendConnected: false,
  error: null,

  loadMindmaps: async () => {
    const { checkHealth, getAllMindMaps } = await import('../services/api')
    
    set({ isLoading: true, error: null })
    
    try {
      await checkHealth()
      set({ backendConnected: true })
      
      const mindmaps = await getAllMindMaps()
      set({ mindmaps, isLoading: false })
    } catch (error) {
      set({ 
        backendConnected: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : '连接后端失败'
      })
    }
  },

  setBackendConnected: (connected: boolean) => {
    set({ backendConnected: connected })
  },

  deleteMindmap: async (id: number) => {
    const { deleteMindMap: deleteApi } = await import('../services/api')
    
    try {
      await deleteApi(id)
      
      const state = get()
      set({
        mindmaps: state.mindmaps.filter(m => m.id !== id)
      })
    } catch (error) {
      throw error
    }
  },

  renameMindmap: async (id: number, name: string) => {
    const { updateMindMap: updateApi } = await import('../services/api')
    
    try {
      const updated = await updateApi(id, { name })
      
      const state = get()
      set({
        mindmaps: state.mindmaps.map(m => m.id === id ? updated : m)
      })
    } catch (error) {
      throw error
    }
  }
}))
