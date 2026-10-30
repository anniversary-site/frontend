import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const OrderApp = lazy(() => import('../App.tsx'))
const AdminRoute = lazy(() => import('../pages/admin/AdminRoute'))
const PolicyPage = lazy(() => import('../pages/PolicyPage'))

// 관리자 화면은 주문서 Context와 API 초기화에서 분리합니다.
export default function RootRoutes() {
  return (
    <Suspense
      fallback={
        <p className="route-loading" role="status">
          화면을 불러오는 중이에요.
        </p>
      }
    >
      <Routes>
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="/policies/:slug" element={<PolicyPage />} />
        <Route path="/*" element={<OrderApp />} />
      </Routes>
    </Suspense>
  )
}
