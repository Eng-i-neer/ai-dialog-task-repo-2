export interface MindMapNode {
  id: number
  text: string
  x: number
  y: number
  children: number[]
  isCenter: boolean
  checked: boolean
  parentId: number | null
  nodeType: 'task' | 'text'
  actualWidth?: number
  actualHeight?: number
}

export interface MindMapData {
  nodes: MindMapNode[]
  nextNodeId: number
  layoutType: 'right' | 'tree'
  connectionStyle: 'curve' | 'right-angle' | 'straight'
  fontFamily: string
  viewMode: 'mindmap' | 'kanban'
  canvasOffsetX: number
  canvasOffsetY: number
}

export interface MindMapItem {
  id: number
  name: string
  data: MindMapData
  created_at: string
  updated_at: string
}

export type LayoutType = 'right' | 'tree'
export type ConnectionStyle = 'curve' | 'right-angle' | 'straight'
export type NodeType = 'task' | 'text'
export type ViewMode = 'mindmap' | 'kanban'
