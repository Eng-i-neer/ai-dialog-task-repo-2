import axios from 'axios'
import type { MindMapData, MindMapItem } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const checkHealth = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/health')
  return response.data
}

export const getAllMindMaps = async (): Promise<MindMapItem[]> => {
  const response = await api.get('/mindmaps')
  return response.data
}

export const getMindMap = async (id: number): Promise<MindMapItem> => {
  const response = await api.get(`/mindmaps/${id}`)
  return response.data
}

export const createMindMap = async (name: string, data: MindMapData): Promise<MindMapItem> => {
  const response = await api.post('/mindmaps', { name, data })
  return response.data
}

export const updateMindMap = async (
  id: number,
  data: { name?: string; data?: MindMapData }
): Promise<MindMapItem> => {
  const response = await api.put(`/mindmaps/${id}`, data)
  return response.data
}

export const deleteMindMap = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/mindmaps/${id}`)
  return response.data
}

export default api
