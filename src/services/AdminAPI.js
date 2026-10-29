import { AdminApiError } from '../types/admin'

import { adminMockRequest } from './adminMockup'

export const useAdminBackend = import.meta.env.VITE_USE_ADMIN === 'true'
const url = (import.meta.env.VITE_ADMIN_BACK_URL ?? '').replace(/\/+$/, '')
const SESSION_KEY = useAdminBackend ? 'urluv-admin-session' : 'urluv-admin-session-mock'
export const ADMIN_UNAUTHORIZED_EVENT = 'urluv-admin-unauthorized'

// 사용자 draftToken 및 목업/실제 관리자 세션은 서로 공유하지 않습니다.
export function getAdminSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return session &&
      typeof session.accessToken === 'string' &&
      Date.parse(session.expiresAt) > Date.now()
      ? session
      : null
  } catch {
    return null
  }
}
export function clearAdminSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* 저장소 접근이 제한된 환경 */
  }
}
function expireSession() {
  clearAdminSession()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT))
}
async function request(path, method = 'GET', body, publicRequest = false) {
  if (useAdminBackend && !url)
    throw new AdminApiError(
      'VITE_ADMIN_BACK_URL에 관리자 API 주소를 설정해 주세요.',
      0,
      'ADMIN_NOT_CONFIGURED',
    )
  const session = getAdminSession()
  if (!publicRequest && !session) {
    expireSession()
    throw new AdminApiError(
      '로그인이 만료되었어요. 다시 로그인해 주세요.',
      401,
      'ADMIN_UNAUTHORIZED',
    )
  }
  if (!useAdminBackend) {
    try {
      return await adminMockRequest(path, method, body, session?.accessToken)
    } catch (error) {
      if (error.code === 'ADMIN_UNAUTHORIZED') expireSession()
      throw error
    }
  }
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
      ...(!publicRequest && session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (response.status === 204) return undefined
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    const error = new AdminApiError(
      payload?.error?.message ?? `요청을 처리하지 못했어요. (${response.status})`,
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.error?.details ?? [],
    )
    if (error.code === 'ADMIN_UNAUTHORIZED') expireSession()
    throw error
  }
  if (payload?.success !== true)
    throw new AdminApiError(
      '서버 응답 형식이 올바르지 않아요.',
      response.status,
      'INVALID_RESPONSE',
    )
  return payload.data
}
const query = (values) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.size ? `?${params}` : ''
}
// A1~A3
export async function loginAdmin(email, password) {
  const session = await request('/auth/login', 'POST', { email, password }, true)
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    throw new AdminApiError(
      '브라우저 저장소를 사용할 수 없어 로그인 정보를 보관하지 못했어요.',
      0,
      'SESSION_STORAGE_UNAVAILABLE',
    )
  }
  return session
}
export const getAdminMe = () => request('/me')
export const changeAdminPassword = (currentPassword, newPassword) =>
  request('/me/password', 'PUT', { currentPassword, newPassword })
// A4~A6
export const getAdminAccounts = () => request('/accounts')
export const createAdminAccount = (fields) => request('/accounts', 'POST', fields)
export const updateAdminAccount = (id, active) => request(`/accounts/${id}`, 'PATCH', { active })
// A7~A9
export const getAdminOrders = (filters = {}) => request(`/orders${query(filters)}`)
export const getAdminOrder = (orderId) => request(`/orders/${orderId}`)
export const getAdminSchedule = (from, to, includeCanceled = false) =>
  request(`/schedule${query({ from, to, includeCanceled })}`)
// A10~A11: 충돌 시 같은 요청을 자동으로 재전송하지 않습니다.
export const confirmAdminPayment = (orderId, expectedVersion, note) =>
  request(`/orders/${orderId}/payment/confirm`, 'POST', { expectedVersion, note })
export const changeAdminOrderStatus = (orderId, fields) =>
  request(`/orders/${orderId}/status`, 'POST', fields)
// A12~A13: 문자를 실제로 발송하지 않고 기록의 상태만 변경합니다.
export const getAdminNotifications = (filters = {}) => request(`/notifications${query(filters)}`)
export const updateAdminNotification = (id, sendStatus) =>
  request(`/notifications/${id}`, 'PATCH', { sendStatus })
