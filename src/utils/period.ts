import type { OrderData } from '../types/order'

export const FREE_PERIOD_DAYS = 7
export const EXTRA_WEEK_PRICE = 1000
export const BASE_ORDER_PRICE = 10000
const DAY_MS = 24 * 60 * 60 * 1000

function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return date.getTime() / DAY_MS
}

export function addDays(value: string, amount: number): string {
  const day = dayNumber(value)
  return day === null ? '' : new Date((day + amount) * DAY_MS).toISOString().slice(0, 10)
}

export function periodPrice(start: string, end: string) {
  const first = dayNumber(start)
  const last = dayNumber(end)
  const days = first !== null && last !== null && last >= first ? last - first + 1 : 0
  const extraDays = Math.max(0, days - FREE_PERIOD_DAYS)
  const extraWeeks = Math.ceil(extraDays / FREE_PERIOD_DAYS)
  const extraFee = extraWeeks * EXTRA_WEEK_PRICE
  return { days, extraDays, extraWeeks, extraFee, total: BASE_ORDER_PRICE + extraFee }
}

export function isValidPeriod(data: Pick<OrderData, 'date' | 'endDate'>, earliest: string) {
  return data.date >= earliest && periodPrice(data.date, data.endDate).days > 0
}
