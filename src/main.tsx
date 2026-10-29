import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import RootRoutes from './routes/RootRoutes'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('앱을 표시할 root 요소가 없습니다.')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <RootRoutes />
    </BrowserRouter>
  </StrictMode>,
)
