import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useOrder } from '../context/OrderContext'
import HomePage from '../pages/HomePage'
import OrderStartPage from '../pages/OrderStartPage'
import OrderLoadPage from '../pages/OrderLoadPage'
import TemplatePage from '../pages/TemplatePage'
import OrderInfoPage from '../pages/OrderInfoPage'
import ContentPage from '../pages/ContentPage'
import ReviewPage from '../pages/ReviewPage'
import DonePage from '../pages/DonePage'
import { PAGE_PATHS } from './paths'

// 주문서 세 단계는 같은 form을 공유합니다.
function OrderFormLayout() {
  const { page, next, error } = useOrder()
  return (
    <form
      noValidate
      id="order-form"
      key={page}
      className={`order-content ${page}-content page-transition`}
      onSubmit={next}
    >
      <Outlet />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={PAGE_PATHS.main} element={<HomePage />} />
      <Route path={PAGE_PATHS.start} element={<OrderStartPage />} />
      <Route path={PAGE_PATHS.load} element={<OrderLoadPage />} />
      <Route element={<OrderFormLayout />}>
        <Route path={PAGE_PATHS.template} element={<TemplatePage />} />
        <Route path={PAGE_PATHS.info} element={<OrderInfoPage />} />
        <Route path={PAGE_PATHS.content} element={<ContentPage />} />
      </Route>
      <Route path={PAGE_PATHS.review} element={<ReviewPage />} />
      <Route path={PAGE_PATHS.done} element={<DonePage />} />
      <Route path="*" element={<Navigate to={PAGE_PATHS.main} replace />} />
    </Routes>
  )
}
