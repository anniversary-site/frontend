import { createContext, useContext } from 'react'
import type { OrderContextValue } from '../types/order'

export const OrderContext = createContext<OrderContextValue | null>(null)

export function useOrder() {
  const context = useContext(OrderContext)
  if (!context) throw new Error('주문서 페이지는 OrderContext 안에서 사용해야 합니다.')
  return context
}
