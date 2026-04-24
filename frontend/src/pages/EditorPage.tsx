import type { FC } from 'react'
import { useParams } from 'react-router-dom'

const EditorPage: FC = () => {
  const { id } = useParams<{ id?: string }>()

  return (
    <div>
      <h1>编辑器页面 {id ? `(ID: ${id})` : '(新建)'}</h1>
    </div>
  )
}

export default EditorPage
