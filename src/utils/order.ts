import type { OrderData, Page } from '../types/order'
import type { ApiError } from '../services/API'
import { isValidPeriod } from './period'

export function validationErrorPage(error: Pick<ApiError, 'code' | 'details'>): Page | null {
  if (error.code !== 'VALIDATION_FAILED') return null
  const stage = error.details.find(
    (detail) =>
      ['REQUIRED', 'MIN_PHOTOS', 'MIN_VIDEOS'].includes(detail.reason) &&
      [1, 2, 3].includes(detail.value ?? 0),
  )?.value
  return stage === 1 ? 'template' : stage === 2 ? 'info' : stage === 3 ? 'content' : null
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  const middleEnd = digits.length === 11 ? 7 : 6
  return `${digits.slice(0, 3)}-${digits.slice(3, middleEnd)}-${digits.slice(middleEnd)}`
}

export type InformationFields = {
  specialDay: string
  specialPlace: string
  story: string
}

export function parseInformation(value: string): InformationFields {
  const fields: InformationFields = { specialDay: '', specialPlace: '', story: '' }
  const matched = value.match(
    /^특별한 날:\s*(.*)\n특별한 장소:\s*(.*)\n우리의 이야기:\s*([\s\S]*)$/,
  )
  if (matched) {
    fields.specialDay = matched[1]
    fields.specialPlace = matched[2]
    fields.story = matched[3]
  } else if (value) fields.story = value
  return fields
}

export const serializeInformation = ({ specialDay, specialPlace, story }: InformationFields) =>
  `특별한 날: ${specialDay}\n특별한 장소: ${specialPlace}\n우리의 이야기: ${story}`

/** 사이트 비밀번호 규칙. 빼빼로 사이트는 숫자 4자리, 그 밖은 공백 없이 4~20자. */
export const isValidSitePassword = (password: string, formType = 'STANDARD') =>
  formType === 'PEPERO' ? /^[0-9]{4}$/.test(password) : /^[^\s]{4,20}$/.test(password)

export function canProceed(page: Page, data: OrderData, earliestDate = '', formType = 'STANDARD') {
  const pepero = formType === 'PEPERO'
  if (page === 'template')
    return data.template >= 0 && (pepero || data.occasion !== '기타' || Boolean(data.other.trim()))
  if (page === 'info')
    return Boolean(
      data.name.trim() &&
      /^01\d-\d{3,4}-\d{4}$/.test(data.phone) &&
      (pepero || Boolean(data.recipientName.trim())) &&
      (data.sitePasswordSet || isValidSitePassword(data.sitePassword, formType)) &&
      (!data.sitePassword || isValidSitePassword(data.sitePassword, formType)) &&
      Boolean(data.sitePasswordHint.trim()) &&
      isValidPeriod(data, earliestDate),
    )
  if (page === 'content') {
    if (pepero) return Boolean(data.mainText.trim() && data.mainText.length <= 50)
    // 사이트 비밀번호는 2단계(주문자 정보)에서 검사합니다.
    const validMusics =
      data.musics.length > 0 &&
      data.musics.every((music) => {
        if (![music.title, music.artist].every((value) => value?.trim() && value.length <= 100))
          return false
        if (!music.youtubeUrl) return true
        try {
          const url = new URL(music.youtubeUrl)
          return (
            ['https:', 'http:'].includes(url.protocol) &&
            /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/.test(url.hostname)
          )
        } catch {
          return false
        }
      })
    return Boolean(
      /^\d{4}-\d{2}-\d{2}$/.test(data.specialDay) &&
      data.specialPlace.trim() &&
      data.specialPlace.length <= 100 &&
      data.specialOccasion.trim() &&
      data.specialOccasion.length <= 50 &&
      data.letterInput.trim() &&
      data.letterInput.length <= 2000 &&
      data.letterChoice !== null &&
      (data.letterChoice !== 'AI' || Boolean(data.letterAi.trim())) &&
      /^https?:\/\//i.test(data.linkUrl) &&
      data.linkUrl.length <= 500 &&
      validMusics &&
      true,
    )
  }
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
  const seoulDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const d = new Date(`${seoulDate}T00:00:00`)
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
