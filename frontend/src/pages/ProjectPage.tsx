import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectsStore } from '../store/store'
import { useEditorStore, DEFAULT_EMPTY_DATA } from '../store/store'
import { createMindMap } from '../services/api'
import toast from 'react-hot-toast'
import type { FC } from 'react'
import '../styles/ProjectPage.css'

const ProjectPage: FC = () => {
  const navigate = useNavigate()
  const { mindmaps, isLoading, backendConnected, loadMindmaps, deleteMindmap, renameMindmap } = useProjectsStore()
  const newMindMap = useEditorStore(state => state.newMindMap)
  const setCurrentMindmap = useEditorStore(state => state.setCurrentMindmap)
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadMindmaps()
  }, [loadMindmaps])

  const handleNewMindMap = useCallback(async () => {
    setIsCreating(true)
    try {
      newMindMap()
      const saved = await createMindMap('未命名思维导图', { ...DEFAULT_EMPTY_DATA })
      setCurrentMindmap(saved.id, saved.name, saved.data)
      navigate(`/edit/${saved.id}`)
      toast.success('已创建新思维导图')
    } catch (error) {
      toast.error('创建失败：无法连接到后端')
      navigate('/edit')
    } finally {
      setIsCreating(false)
    }
  }, [newMindMap, setCurrentMindmap, navigate])

  const handleOpenMindMap = useCallback((id: number) => {
    navigate(`/edit/${id}`)
  }, [navigate])

  const handleDelete = useCallback((id: number) => {
    setDeleteConfirmId(id)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (deleteConfirmId === null) return
    
    try {
      await deleteMindmap(deleteConfirmId)
      toast.success('删除成功')
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setDeleteConfirmId(null)
    }
  }, [deleteConfirmId, deleteMindmap])

  const handleRename = useCallback((id: number, name: string) => {
    setRenameId(id)
    setRenameName(name)
  }, [])

  const confirmRename = useCallback(async () => {
    if (renameId === null) return
    
    const trimmedName = renameName.trim() || '未命名思维导图'
    
    try {
      await renameMindmap(renameId, trimmedName)
      toast.success('重命名成功')
    } catch (error) {
      toast.error('重命名失败')
    } finally {
      setRenameId(null)
      setRenameName('')
    }
  }, [renameId, renameName, renameMindmap])

  return (
    <div className="project-page">
      <div className="project-page-header">
        <h1>我的思维导图</h1>
        <button 
          className="new-btn"
          onClick={handleNewMindMap}
          disabled={isCreating}
        >
          <span className="icon">+</span> 新建思维导图
        </button>
      </div>
      
      <div className="project-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-icon">⏳</div>
            <div className="loading-text">加载中...</div>
          </div>
        ) : !backendConnected ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <div className="empty-title">后端未连接</div>
            <div className="empty-desc">请检查后端服务是否启动在端口 5000</div>
            <button 
              className="retry-btn"
              onClick={() => loadMindmaps()}
            >
              重试连接
            </button>
          </div>
        ) : mindmaps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-title">暂无思维导图</div>
            <div className="empty-desc">点击上方"新建思维导图"按钮创建</div>
          </div>
        ) : (
          mindmaps.map(mindmap => (
            <div 
              key={mindmap.id} 
              className="project-card"
              onDoubleClick={() => handleOpenMindMap(mindmap.id)}
            >
              <div className="project-card-header">
                <div className="project-name" title={mindmap.name}>
                  {mindmap.name}
                </div>
              </div>
              <div className="project-time">
                更新于 {mindmap.updated_at}
              </div>
              <div className="project-actions">
                <button 
                  className="action-btn open"
                  onClick={() => handleOpenMindMap(mindmap.id)}
                >
                  打开
                </button>
                <button 
                  className="action-btn rename"
                  onClick={() => handleRename(mindmap.id, mindmap.name)}
                >
                  重命名
                </button>
                <button 
                  className="action-btn delete"
                  onClick={() => handleDelete(mindmap.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">确认删除</div>
            <div className="modal-content">
              确定要删除此思维导图吗？
              <br />
              <span className="warning-text">此操作不可撤销</span>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => setDeleteConfirmId(null)}
              >
                取消
              </button>
              <button 
                className="modal-btn danger"
                onClick={confirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {renameId !== null && (
        <div className="modal-overlay" onClick={() => { setRenameId(null); setRenameName('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">重命名</div>
            <div className="modal-content">
              <input
                type="text"
                className="rename-input"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') { setRenameId(null); setRenameName('') }
                }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => { setRenameId(null); setRenameName('') }}
              >
                取消
              </button>
              <button 
                className="modal-btn primary"
                onClick={confirmRename}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectPage
