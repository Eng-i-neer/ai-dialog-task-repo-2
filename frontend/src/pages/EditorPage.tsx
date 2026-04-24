import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditorStore } from '../store/store'
import { getMindMap, createMindMap, updateMindMap } from '../services/api'
import toast from 'react-hot-toast'
import type { FC } from 'react'
import type { LayoutType, ConnectionStyle, MindMapNode } from '../types'
import '../styles/EditorPage.css'

const DEFAULT_NODE_HEIGHT = 35
const DEFAULT_NODE_WIDTH = 100
const LEVEL_GAP = 40
const VERTICAL_GAP = 20
const LINE_GAP = 5

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", label: '默认' },
  { value: "'Microsoft YaHei', '微软雅黑', sans-serif", label: '微软雅黑' },
  { value: "'SimSun', '宋体', serif", label: '宋体' },
  { value: "'KaiTi', '楷体', serif", label: '楷体' },
  { value: "'SimHei', '黑体', sans-serif", label: '黑体' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: "'Courier New', monospace", label: 'Courier New' },
]

const EditorPage: FC = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodeRefs, setNodeRefs] = useState<Map<number, HTMLDivElement>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    nodes,
    layoutType,
    connectionStyle,
    fontFamily,
    selectedNodeId,
    editingNodeId,
    contextMenuNodeId,
    contextMenuPosition,
    currentMindmapId,
    currentMindmapName,
    canUndo,
    canRedo,
    addCenterNode,
    addChildNode,
    deleteNode,
    updateNodeText,
    toggleNodeChecked,
    selectNode,
    startEditing,
    stopEditing,
    showContextMenu,
    hideContextMenu,
    setLayoutType,
    setConnectionStyle,
    setFontFamily,
    setCurrentMindmap,
    newMindMap,
    undo,
    redo
  } = useEditorStore()

  useEffect(() => {
    if (id) {
      loadMindmap(parseInt(id, 10))
    } else {
      newMindMap()
    }
    
    return () => {
      hideContextMenu()
    }
  }, [id, newMindMap, hideContextMenu])

  const loadMindmap = useCallback(async (mindmapId: number) => {
    setIsLoading(true)
    try {
      const mindmap = await getMindMap(mindmapId)
      setCurrentMindmap(mindmap.id, mindmap.name, mindmap.data)
      toast.success(`已加载：${mindmap.name}`)
    } catch (error) {
      toast.error('加载失败')
      newMindMap()
    } finally {
      setIsLoading(false)
    }
  }, [setCurrentMindmap, newMindMap])

  const handleSave = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('没有内容可保存')
      return
    }
    
    setIsSaving(true)
    const mindmapData = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      nextNodeId: useEditorStore.getState().nextNodeId,
      layoutType,
      connectionStyle,
      fontFamily
    }
    
    try {
      let saved
      if (currentMindmapId) {
        saved = await updateMindMap(currentMindmapId, { 
          name: currentMindmapName,
          data: mindmapData 
        })
      } else {
        saved = await createMindMap(currentMindmapName || '未命名思维导图', mindmapData)
      }
      
      setCurrentMindmap(saved.id, saved.name)
      toast.success('保存成功')
      if (!id) {
        navigate(`/edit/${saved.id}`)
      }
    } catch (error) {
      toast.error('保存失败：无法连接到后端')
    } finally {
      setIsSaving(false)
    }
  }, [nodes, layoutType, connectionStyle, fontFamily, currentMindmapId, currentMindmapName, setCurrentMindmap, id, navigate])

  const handleAddChildFromContextMenu = useCallback(() => {
    if (contextMenuNodeId !== null) {
      addChildNode(contextMenuNodeId)
    }
    hideContextMenu()
  }, [contextMenuNodeId, addChildNode, hideContextMenu])

  const handleDeleteFromContextMenu = useCallback(() => {
    if (contextMenuNodeId !== null) {
      deleteNode(contextMenuNodeId)
    }
    hideContextMenu()
  }, [contextMenuNodeId, deleteNode, hideContextMenu])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
        return
      }
      
      if (e.ctrlKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          navigateToPreviousSibling()
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          navigateToNextSibling()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          navigateToParent()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          navigateToFirstChild()
        } else if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
        return
      }
      
      if (e.key === ' ' && !editingNodeId && selectedNodeId) {
        e.preventDefault()
        startEditing(selectedNodeId)
      }
      
      if (e.key === 'Escape') {
        hideContextMenu()
        if (editingNodeId) {
          stopEditing()
        }
      }
      
      if (e.key === 'Enter' && editingNodeId) {
        if (e.ctrlKey) {
          e.preventDefault()
          const node = nodes.find(n => n.id === editingNodeId)
          if (node) {
            const contentElement = document.querySelector(`[data-node-id="${editingNodeId}"] .node-content`)
            if (contentElement && 'textContent' in contentElement) {
              updateNodeText(editingNodeId, contentElement.textContent || '')
            }
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, editingNodeId, selectedNodeId, startEditing, hideContextMenu, stopEditing, handleSave, updateNodeText, nodes])

  const navigateToPreviousSibling = useCallback(() => {
    if (!selectedNodeId) return
    
    stopEditing()
    const currentNode = nodes.find(n => n.id === selectedNodeId)
    if (!currentNode) return
    
    let siblings: MindMapNode[] = []
    
    if (currentNode.isCenter) {
      siblings = nodes.filter(n => n.isCenter)
    } else if (currentNode.parentId) {
      const parent = nodes.find(n => n.id === currentNode.parentId)
      if (parent) {
        siblings = parent.children
          .map(childId => nodes.find(n => n.id === childId))
          .filter(n => n) as MindMapNode[]
      }
    }
    
    if (siblings.length === 0) return
    
    if (layoutType === 'right') {
      siblings.sort((a, b) => a.y - b.y)
    } else {
      siblings.sort((a, b) => a.x - b.x)
    }
    
    const currentIndex = siblings.findIndex(n => n.id === selectedNodeId)
    if (currentIndex > 0) {
      selectNode(siblings[currentIndex - 1].id)
    }
  }, [selectedNodeId, nodes, layoutType, stopEditing, selectNode])

  const navigateToNextSibling = useCallback(() => {
    if (!selectedNodeId) return
    
    stopEditing()
    const currentNode = nodes.find(n => n.id === selectedNodeId)
    if (!currentNode) return
    
    let siblings: MindMapNode[] = []
    
    if (currentNode.isCenter) {
      siblings = nodes.filter(n => n.isCenter)
    } else if (currentNode.parentId) {
      const parent = nodes.find(n => n.id === currentNode.parentId)
      if (parent) {
        siblings = parent.children
          .map(childId => nodes.find(n => n.id === childId))
          .filter(n => n) as MindMapNode[]
      }
    }
    
    if (siblings.length === 0) return
    
    if (layoutType === 'right') {
      siblings.sort((a, b) => a.y - b.y)
    } else {
      siblings.sort((a, b) => a.x - b.x)
    }
    
    const currentIndex = siblings.findIndex(n => n.id === selectedNodeId)
    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      selectNode(siblings[currentIndex + 1].id)
    }
  }, [selectedNodeId, nodes, layoutType, stopEditing, selectNode])

  const navigateToParent = useCallback(() => {
    if (!selectedNodeId) return
    
    stopEditing()
    const currentNode = nodes.find(n => n.id === selectedNodeId)
    if (!currentNode || !currentNode.parentId) return
    
    selectNode(currentNode.parentId)
  }, [selectedNodeId, nodes, stopEditing, selectNode])

  const navigateToFirstChild = useCallback(() => {
    if (!selectedNodeId) return
    
    stopEditing()
    const currentNode = nodes.find(n => n.id === selectedNodeId)
    if (!currentNode || currentNode.children.length === 0) return
    
    const firstChild = nodes.find(n => n.id === currentNode.children[0])
    if (firstChild) {
      selectNode(firstChild.id)
    }
  }, [selectedNodeId, nodes, stopEditing, selectNode])

  const handleNodeRef = useCallback((nodeId: number, element: HTMLDivElement | null) => {
    if (element) {
      setNodeRefs(prev => new Map(prev).set(nodeId, element))
    }
  }, [])

  const getNodeHeight = useCallback((nodeId: number) => {
    const ref = nodeRefs.get(nodeId)
    return ref ? ref.offsetHeight : DEFAULT_NODE_HEIGHT
  }, [nodeRefs])

  const getNodeWidth = useCallback((nodeId: number) => {
    const ref = nodeRefs.get(nodeId)
    return ref ? ref.offsetWidth : DEFAULT_NODE_WIDTH
  }, [nodeRefs])

  const getSubtreeHeight = useCallback((nodeId: number, nodesList: MindMapNode[]): number => {
    const node = nodesList.find(n => n.id === nodeId)
    if (!node || node.children.length === 0) return getNodeHeight(nodeId)
    
    let totalHeight = 0
    node.children.forEach(childId => {
      totalHeight += getSubtreeHeight(childId, nodesList) + VERTICAL_GAP
    })
    totalHeight -= VERTICAL_GAP
    
    return Math.max(getNodeHeight(nodeId), totalHeight)
  }, [getNodeHeight])

  const getSubtreeWidth = useCallback((nodeId: number, nodesList: MindMapNode[]): number => {
    const node = nodesList.find(n => n.id === nodeId)
    if (!node || node.children.length === 0) return getNodeWidth(nodeId)
    
    let totalWidth = 0
    node.children.forEach(childId => {
      totalWidth += getSubtreeWidth(childId, nodesList) + VERTICAL_GAP
    })
    totalWidth -= VERTICAL_GAP
    
    return Math.max(getNodeWidth(nodeId), totalWidth)
  }, [getNodeWidth])

  const calculateRightLayout = useCallback((nodesList: MindMapNode[]): MindMapNode[] => {
    const centerNodes = nodesList.filter(n => n.isCenter)
    const resultNodes = JSON.parse(JSON.stringify(nodesList))
    
    const getLevelMaxWidth = (nodeId: number, level: number, levelWidths: Record<number, number>) => {
      const node = resultNodes.find((n: MindMapNode) => n.id === nodeId)
      if (!node) return
      
      const actualW = getNodeWidth(nodeId)
      if (!levelWidths[level] || actualW > levelWidths[level]) {
        levelWidths[level] = actualW
      }
      
      node.children.forEach((childId: number) => {
        getLevelMaxWidth(childId, level + 1, levelWidths)
      })
    }
    
    const levelWidths: Record<number, number> = {}
    centerNodes.forEach(centerNode => {
      getLevelMaxWidth(centerNode.id, 0, levelWidths)
    })
    
    const calculateXPositions = () => {
      const xPositions: Record<number, number> = {}
      let currentX = 100
      
      const maxLevel = Math.max(...Object.keys(levelWidths).map(Number), 0)
      
      for (let level = 0; level <= maxLevel; level++) {
        xPositions[level] = currentX
        currentX += (levelWidths[level] || DEFAULT_NODE_WIDTH) + LEVEL_GAP
      }
      
      return xPositions
    }
    
    const xPositions = calculateXPositions()
    
    const layoutBottomUp = (nodeId: number, level: number, startY: number): { y: number; height: number } => {
      const node = resultNodes.find((n: MindMapNode) => n.id === nodeId)
      if (!node) return { y: startY, height: 0 }
      
      const currentNodeHeight = getNodeHeight(nodeId)
      
      node.x = xPositions[level] || (100 + level * (DEFAULT_NODE_WIDTH + LEVEL_GAP))
      
      if (node.children.length === 0) {
        node.y = startY
        return { y: startY + currentNodeHeight, height: currentNodeHeight }
      } else {
        const childHeights: { childId: number; startY: number; endY: number; height: number }[] = []
        let childY = startY
        
        node.children.forEach((childId: number) => {
          const result = layoutBottomUp(childId, level + 1, childY)
          childHeights.push({
            childId: childId,
            startY: childY,
            endY: result.y,
            height: result.height
          })
          childY = result.y + VERTICAL_GAP
        })
        
        if (childHeights.length > 0) {
          const firstChild = childHeights[0]
          const lastChild = childHeights[childHeights.length - 1]
          const firstChildHeight = getNodeHeight(firstChild.childId)
          const lastChildHeight = getNodeHeight(lastChild.childId)
          
          const firstChildCenterY = firstChild.startY + firstChildHeight / 2
          const lastChildCenterY = lastChild.startY + lastChildHeight / 2
          
          const childrenCenterY = (firstChildCenterY + lastChildCenterY) / 2
          node.y = childrenCenterY - currentNodeHeight / 2
          
          const childrenTotalHeight = lastChild.endY - firstChild.startY
          
          return { 
            y: lastChild.endY, 
            height: Math.max(currentNodeHeight, childrenTotalHeight)
          }
        }
        
        return { y: startY + currentNodeHeight, height: currentNodeHeight }
      }
    }
    
    let currentY = 50
    centerNodes.forEach(centerNode => {
      const subtreeHeight = getSubtreeHeight(centerNode.id, resultNodes)
      layoutBottomUp(centerNode.id, 0, currentY)
      currentY += subtreeHeight + 50
    })
    
    return resultNodes
  }, [getNodeHeight, getNodeWidth, getSubtreeHeight])

  const calculateTreeLayout = useCallback((nodesList: MindMapNode[]): MindMapNode[] => {
    const centerNodes = nodesList.filter(n => n.isCenter)
    const resultNodes = JSON.parse(JSON.stringify(nodesList))
    const levelHeight = 100
    const horizontalGap = 30
    
    const nodeCenters: Record<number, number> = {}
    
    const getSubtreeCenters = (nodeId: number, level: number, startX: number): number => {
      const node = resultNodes.find((n: MindMapNode) => n.id === nodeId)
      if (!node) return startX
      
      const currentNodeWidth = getNodeWidth(nodeId)
      const subtreeWidth = getSubtreeWidth(nodeId, resultNodes)
      
      node.y = 50 + level * levelHeight
      
      if (node.children.length === 0) {
        node.x = startX + (subtreeWidth - currentNodeWidth) / 2
        nodeCenters[nodeId] = node.x + currentNodeWidth / 2
        return startX + subtreeWidth
      } else {
        let childrenTotalWidth = 0
        node.children.forEach((childId: number) => {
          childrenTotalWidth += getSubtreeWidth(childId, resultNodes) + horizontalGap
        })
        childrenTotalWidth -= horizontalGap
        
        const availableWidth = Math.max(currentNodeWidth, childrenTotalWidth)
        let childX = startX + (availableWidth - childrenTotalWidth) / 2
        
        node.children.forEach((childId: number) => {
          const childSubtreeWidth = getSubtreeWidth(childId, resultNodes)
          getSubtreeCenters(childId, level + 1, childX)
          childX += childSubtreeWidth + horizontalGap
        })
        
        const firstChild = resultNodes.find((n: MindMapNode) => n.id === node.children[0])
        const lastChild = resultNodes.find((n: MindMapNode) => n.id === node.children[node.children.length - 1])
        
        if (firstChild && lastChild) {
          const firstChildCenter = nodeCenters[node.children[0]]
          const lastChildCenter = nodeCenters[node.children[node.children.length - 1]]
          
          const childrenCenterX = (firstChildCenter + lastChildCenter) / 2
          node.x = childrenCenterX - currentNodeWidth / 2
        } else {
          node.x = startX + (availableWidth - currentNodeWidth) / 2
        }
        
        nodeCenters[nodeId] = node.x + currentNodeWidth / 2
        
        return startX + availableWidth
      }
    }
    
    let currentX = 50
    centerNodes.forEach(centerNode => {
      const subtreeWidth = getSubtreeWidth(centerNode.id, resultNodes)
      getSubtreeCenters(centerNode.id, 0, currentX)
      currentX += subtreeWidth + 150
    })
    
    return resultNodes
  }, [getNodeWidth, getSubtreeWidth])

  const calculateLayout = useCallback((nodesList: MindMapNode[]): MindMapNode[] => {
    if (nodesList.length === 0) return nodesList
    
    if (layoutType === 'right') {
      return calculateRightLayout(nodesList)
    } else {
      return calculateTreeLayout(nodesList)
    }
  }, [layoutType, calculateRightLayout, calculateTreeLayout])

  const positionedNodes = calculateLayout(nodes)

  const drawStraightLine = (startX: number, startY: number, endX: number, endY: number): string => {
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  const drawCurvedLine = (startX: number, startY: number, endX: number, endY: number): string => {
    if (layoutType === 'right') {
      const controlX1 = startX + (endX - startX) / 2
      const controlY1 = startY
      const controlX2 = startX + (endX - startX) / 2
      const controlY2 = endY
      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
    } else {
      const controlX1 = startX
      const controlY1 = startY + (endY - startY) / 2
      const controlX2 = endX
      const controlY2 = endY - (endY - startY) / 2
      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
    }
  }

  const renderConnections = useCallback(() => {
    const paths: { d: string }[] = []
    
    const parentNodes = positionedNodes.filter(n => n.children.length > 0)
    
    parentNodes.forEach(parent => {
      const childNodes = parent.children
        .map(childId => positionedNodes.find(n => n.id === childId))
        .filter(n => n) as MindMapNode[]
      
      if (childNodes.length === 0) return
      
      const parentActualWidth = getNodeWidth(parent.id)
      const parentActualHeight = getNodeHeight(parent.id)
      
      let startX, startY
      
      if (layoutType === 'right') {
        startX = parent.x + parentActualWidth + LINE_GAP
        startY = parent.y + parentActualHeight / 2
      } else {
        startX = parent.x + parentActualWidth / 2
        startY = parent.y + parentActualHeight + LINE_GAP
      }
      
      if (connectionStyle === 'straight') {
        childNodes.forEach(child => {
          const childActualWidth = getNodeWidth(child.id)
          const childActualHeight = getNodeHeight(child.id)
          let endX, endY
          
          if (layoutType === 'right') {
            endX = child.x - LINE_GAP
            endY = child.y + childActualHeight / 2
          } else {
            endX = child.x + childActualWidth / 2
            endY = child.y - LINE_GAP
          }
          
          paths.push({ d: drawStraightLine(startX, startY, endX, endY) })
        })
      } else if (connectionStyle === 'curve') {
        childNodes.forEach(child => {
          const childActualWidth = getNodeWidth(child.id)
          const childActualHeight = getNodeHeight(child.id)
          let endX, endY
          
          if (layoutType === 'right') {
            endX = child.x - LINE_GAP
            endY = child.y + childActualHeight / 2
          } else {
            endX = child.x + childActualWidth / 2
            endY = child.y - LINE_GAP
          }
          
          paths.push({ d: drawCurvedLine(startX, startY, endX, endY) })
        })
      } else {
        if (childNodes.length === 1) {
          const child = childNodes[0]
          const childActualWidth = getNodeWidth(child.id)
          const childActualHeight = getNodeHeight(child.id)
          let endX, endY
          
          if (layoutType === 'right') {
            endX = child.x - LINE_GAP
            endY = child.y + childActualHeight / 2
          } else {
            endX = child.x + childActualWidth / 2
            endY = child.y - LINE_GAP
          }
          
          let pathD = ''
          if (layoutType === 'right') {
            const midX = (startX + endX) / 2
            pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`
          } else {
            const midY = (startY + endY) / 2
            pathD = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
          }
          paths.push({ d: pathD })
        } else {
          if (layoutType === 'right') {
            const sortedChildren = [...childNodes].sort((a, b) => a.y - b.y)
            
            const firstChildHeight = getNodeHeight(sortedChildren[0].id)
            const lastChildHeight = getNodeHeight(sortedChildren[sortedChildren.length - 1].id)
            
            const firstChildY = sortedChildren[0].y + firstChildHeight / 2
            const lastChildY = sortedChildren[sortedChildren.length - 1].y + lastChildHeight / 2
            
            const firstChildLeftX = sortedChildren[0].x - LINE_GAP
            const verticalLineX = firstChildLeftX
            
            paths.push({ d: `M ${startX} ${startY} L ${verticalLineX} ${startY}` })
            paths.push({ d: `M ${verticalLineX} ${firstChildY} L ${verticalLineX} ${lastChildY}` })
            
            sortedChildren.forEach(child => {
              const childActualHeight = getNodeHeight(child.id)
              const childCenterY = child.y + childActualHeight / 2
              const childLeftEdge = child.x
              
              paths.push({ d: `M ${verticalLineX} ${childCenterY} L ${childLeftEdge} ${childCenterY}` })
            })
          } else {
            const sortedChildren = [...childNodes].sort((a, b) => a.x - b.x)
            
            const firstChildWidth = getNodeWidth(sortedChildren[0].id)
            const lastChildWidth = getNodeWidth(sortedChildren[sortedChildren.length - 1].id)
            
            const firstChildX = sortedChildren[0].x + firstChildWidth / 2
            const lastChildX = sortedChildren[sortedChildren.length - 1].x + lastChildWidth / 2
            
            const firstChildTopY = sortedChildren[0].y - LINE_GAP
            const horizontalLineY = firstChildTopY
            
            paths.push({ d: `M ${startX} ${startY} L ${startX} ${horizontalLineY}` })
            paths.push({ d: `M ${firstChildX} ${horizontalLineY} L ${lastChildX} ${horizontalLineY}` })
            
            sortedChildren.forEach(child => {
              const childActualWidth = getNodeWidth(child.id)
              const childCenterX = child.x + childActualWidth / 2
              const childTopEdge = child.y
              
              paths.push({ d: `M ${childCenterX} ${horizontalLineY} L ${childCenterX} ${childTopEdge}` })
            })
          }
        }
      }
    })
    
    return paths
  }, [positionedNodes, layoutType, connectionStyle, getNodeWidth, getNodeHeight])

  const connectionPaths = renderConnections()

  const getContainerSize = useCallback(() => {
    let maxX = 0
    let maxY = 0
    
    positionedNodes.forEach(node => {
      const nodeWidth = getNodeWidth(node.id)
      const nodeHeight = getNodeHeight(node.id)
      maxX = Math.max(maxX, node.x + nodeWidth + 100)
      maxY = Math.max(maxY, node.y + nodeHeight + 50)
    })
    
    return {
      width: Math.max(maxX, 800),
      height: Math.max(maxY, 600)
    }
  }, [positionedNodes, getNodeWidth, getNodeHeight])

  const containerSize = getContainerSize()

  const handleContentBlur = useCallback((nodeId: number, element: HTMLElement) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node && element.textContent !== node.text) {
      updateNodeText(nodeId, element.textContent || '')
    } else {
      stopEditing()
    }
  }, [nodes, updateNodeText, stopEditing])

  if (isLoading) {
    return (
      <div className="editor-page">
        <div className="loading-state">
          <div className="loading-icon">⏳</div>
          <div className="loading-text">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="toolbar">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回
        </button>
        
        <div className="current-info">
          <span>当前：</span>
          <span className="name">{currentMindmapName}</span>
        </div>
        
        <div className="toolbar-separator" />
        
        <button className="primary-btn" onClick={addCenterNode}>
          添加中心节点
        </button>
        
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </button>
        
        <div className="toolbar-separator" />
        
        <button onClick={undo} disabled={!canUndo()} title="撤销 (Ctrl+Z)">
          撤销
        </button>
        <button onClick={redo} disabled={!canRedo()} title="重做 (Ctrl+Y)">
          重做
        </button>
        
        <div className="toolbar-separator" />
        
        <div className="select-group">
          <label>布局：</label>
          <select 
            value={layoutType}
            onChange={e => setLayoutType(e.target.value as LayoutType)}
          >
            <option value="right">右向布局</option>
            <option value="tree">树状图布局</option>
          </select>
        </div>
        
        <div className="select-group">
          <label>连线：</label>
          <select 
            value={connectionStyle}
            onChange={e => setConnectionStyle(e.target.value as ConnectionStyle)}
          >
            <option value="curve">曲线</option>
            <option value="right-angle">直角</option>
            <option value="straight">直线</option>
          </select>
        </div>
        
        <div className="select-group">
          <label>字体：</label>
          <select 
            value={fontFamily}
            onChange={e => setFontFamily(e.target.value)}
          >
            {FONT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="mindmap-container" ref={containerRef}>
        <div 
          className="mindmap-canvas"
          style={{ width: containerSize.width, height: containerSize.height }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              selectNode(null)
              hideContextMenu()
            }
          }}
        >
          <svg 
            className="connections-svg"
            width={containerSize.width}
            height={containerSize.height}
          >
            {connectionPaths.map((path, index) => (
              <path 
                key={index} 
                d={path.d} 
                className="connection-line"
              />
            ))}
          </svg>
          
          {positionedNodes.map(node => (
            <div
              key={node.id}
              ref={el => handleNodeRef(node.id, el)}
              className={`node ${selectedNodeId === node.id ? 'selected' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                fontFamily: fontFamily
              }}
              data-node-id={node.id}
              onClick={e => {
                e.stopPropagation()
                selectNode(node.id)
              }}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
                showContextMenu(node.id, e.clientX, e.clientY)
              }}
            >
              <input
                type="checkbox"
                className={`node-checkbox ${node.checked ? 'checked' : ''}`}
                checked={node.checked}
                onChange={e => {
                  e.stopPropagation()
                  toggleNodeChecked(node.id)
                }}
              />
              <div
                className="node-content"
                contentEditable={true}
                suppressContentEditableWarning={true}
                onDoubleClick={e => {
                  e.stopPropagation()
                  startEditing(node.id)
                  setTimeout(() => {
                    const range = document.createRange()
                    range.selectNodeContents(e.currentTarget)
                    const selection = window.getSelection()
                    selection?.removeAllRanges()
                    selection?.addRange(range)
                  }, 10)
                }}
                onFocus={() => {
                  startEditing(node.id)
                }}
                onBlur={e => {
                  handleContentBlur(node.id, e.target)
                }}
                onInput={e => {
                  const target = e.target as HTMLElement
                  const updatedNodes = nodes.map(n =>
                    n.id === node.id ? { ...n, text: target.textContent || '' } : n
                  )
                  reLayout(updatedNodes)
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault()
                    handleContentBlur(node.id, e.currentTarget)
                  }
                }}
              >
                {node.text}
              </div>
            </div>
          ))}
          
          {positionedNodes.length === 0 && (
            <div className="empty-message">
              点击工具栏"添加中心节点"开始创建思维导图
            </div>
          )}
        </div>
      </div>
      
      {contextMenuPosition && contextMenuNodeId !== null && (
        <div 
          className="context-menu"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <div 
            className="context-menu-item"
            onClick={handleAddChildFromContextMenu}
          >
            添加子节点
          </div>
          <div 
            className="context-menu-item delete"
            onClick={handleDeleteFromContextMenu}
          >
            删除
          </div>
        </div>
      )}
    </div>
  )
}

function reLayout(updatedNodes: MindMapNode[]) {
  useEditorStore.setState({ nodes: updatedNodes })
}

export default EditorPage
