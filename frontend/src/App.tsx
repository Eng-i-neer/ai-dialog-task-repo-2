import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProjectPage from './pages/ProjectPage'
import EditorPage from './pages/EditorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectPage />} />
        <Route path="/edit/:id?" element={<EditorPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
