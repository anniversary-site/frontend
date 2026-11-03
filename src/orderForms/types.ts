import type { ComponentType } from 'react'
import type { PreviewTarget } from '../types/order'

export interface OrderFormGuideProps {
  target: PreviewTarget
  documentNo?: number
  onClose: () => void
}

export interface OrderFormDefinition {
  Content: ComponentType
  Guide: ComponentType<OrderFormGuideProps>
}
