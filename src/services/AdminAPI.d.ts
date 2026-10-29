import type {
  AdminAccount,
  AdminDetail,
  AdminNotification,
  AdminOrder,
  AdminPageResult,
  AdminSchedule,
  AdminSession,
  NotificationStatus,
  OrderFilters,
} from '../types/admin'
export const useAdminBackend: boolean
export const ADMIN_UNAUTHORIZED_EVENT: string
export function getAdminSession(): AdminSession | null
export function clearAdminSession(): void
export function loginAdmin(email: string, password: string): Promise<AdminSession>
export function getAdminMe(): Promise<AdminAccount>
export function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void>
export function getAdminAccounts(): Promise<AdminAccount[]>
export function createAdminAccount(fields: {
  email: string
  name: string
  password: string
}): Promise<AdminAccount>
export function updateAdminAccount(id: number, active: boolean): Promise<AdminAccount>
export function getAdminOrders(filters?: OrderFilters): Promise<AdminPageResult<AdminOrder>>
export function getAdminOrder(orderId: number): Promise<AdminDetail>
export function getAdminSchedule(
  from: string,
  to: string,
  includeCanceled?: boolean,
): Promise<AdminSchedule[]>
export function confirmAdminPayment(
  orderId: number,
  expectedVersion: number,
  note?: string,
): Promise<AdminDetail>
export function changeAdminOrderStatus(
  orderId: number,
  fields: {
    status: 'DELIVERED' | 'CANCELED'
    expectedVersion: number
    siteUrl?: string
    note?: string
  },
): Promise<AdminDetail>
export function getAdminNotifications(filters?: {
  sendStatus?: string
  page?: number
  size?: number
}): Promise<AdminPageResult<AdminNotification>>
export function updateAdminNotification(
  id: number,
  sendStatus: NotificationStatus,
): Promise<AdminNotification>
