import type { OrderData, Page } from '../types/order'
import { isValidPeriod } from './period'

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

export function canProceed(page: Page, data: OrderData, earliestDate = '') {
  if (page === 'template')
    return data.template >= 0 && (data.occasion !== '기타' || Boolean(data.other.trim()))
  if (page === 'info')
    return Boolean(
      data.name.trim() &&
      /^01\d-\d{3,4}-\d{4}$/.test(data.phone) &&
      (data.sitePasswordSet || /^[^\s]{4,20}$/.test(data.sitePassword)) &&
      (!data.sitePassword || /^[^\s]{4,20}$/.test(data.sitePassword)) &&
      Boolean(data.sitePasswordHint.trim()) &&
      isValidPeriod(data, earliestDate),
    )
  if (page === 'content') {
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
    const information = parseInformation(data.memoryInput)
    return Boolean(
      information.specialDay.trim() &&
      information.specialPlace.trim() &&
      information.story.trim() &&
      validMusics &&
      data.letters.every(
        (letter) => letter.content.length <= 2000 && (letter.input?.length ?? 0) <= 2000,
      ),
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
