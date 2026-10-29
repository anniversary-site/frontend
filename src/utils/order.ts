import type { OrderData, Page } from '../types/order'
import { isValidPeriod } from './period'

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  const middleEnd = digits.length === 11 ? 7 : 6
  return `${digits.slice(0, 3)}-${digits.slice(3, middleEnd)}-${digits.slice(middleEnd)}`
}

export function canProceed(page: Page, data: OrderData, earliestDate = '') {
  if (page === 'template')
    return data.template >= 0 && (data.occasion !== '기타' || Boolean(data.other.trim()))
  if (page === 'info')
    return Boolean(
      data.name.trim() &&
      /^01\d-\d{3,4}-\d{4}$/.test(data.phone) &&
      isValidPeriod(data, earliestDate),
    )
  if (page === 'content') return Boolean(data.main.trim())
  return true
}

export function mediaDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return ''
  const length = Math.floor(seconds)
  return `${Math.floor(length / 60)}:${String(length % 60).padStart(2, '0')}`
}

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const minDate = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 7)
  return d
}

/** 저장·조회 시에는 숫자로만 구성된 동일한 키를 사용합니다. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidPhone(value: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(value))
}
