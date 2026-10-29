import type { Draft, OrderRequest } from '../services/API'

export type AdminOrderStatus = 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELED'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'
export interface AdminAccount {
  id: number
  email: string
  name: string
  active: boolean
  lastLoginAt: string | null
  createdAt: string
}
export interface AdminSession {
  accessToken: string
  expiresAt: string
  admin: AdminAccount
}
export interface AdminSchedule {
  orderId: number
  orderNo: string
  customerName: string
  templateName: string
  status: AdminOrderStatus
  payStatus: string
  useStartDate: string
  useEndDate: string | null
  dueDate: string
}
export interface AdminOrder extends AdminSchedule {
  phone: string
  anniversaryType: string
  totalPrice: number
  submittedAt: string
  pendingNotificationCount: number
}
export interface AdminNotification {
  notificationId: number
  orderId: number
  orderNo: string
  customerName: string
  type: string
  phone: string
  content: string
  sendStatus: NotificationStatus
  sentAt: string | null
  createdAt: string
}
export interface AdminDetail {
  order: {
    orderId: number
    orderNo: string
    status: AdminOrderStatus
    payStatus: string
    version: number
    totalPrice: number
    depositorName: string
    paidAt: string | null
    siteUrl: string | null
    adminMemo: string | null
    submittedAt: string
    deliveredAt: string | null
  }
  content: Draft
  requests: OrderRequest[]
  notifications: AdminNotification[]
  auditLogs: {
    id: number
    adminName: string
    action: string
    fromValue: string
    toValue: string
    note: string | null
    createdAt: string
  }[]
}
export interface AdminPageResult<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface OrderFilters {
  status?: string
  payStatus?: string
  keyword?: string
  page?: number
  size?: number
}
export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details: { field: string; reason: string }[] = [],
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}
