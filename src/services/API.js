import { mockRequest } from './mockup.js'

// true일 때만 실제 서버를 사용합니다. 미설정 또는 false이면 목업을 사용합니다.
const useBackend = import.meta.env.VITE_USE_BACKEND === 'true'
// VITE_API_URL에는 /api/v1까지 포함한 주소를 설정합니다.
const url = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, code, details = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// 성공 시 data를 반환하고, 실패 시 서버의 message/code/details를 보존합니다.
async function request(path, { method = 'GET', token, body } = {}) {
  if (!useBackend) {
    try {
      return await mockRequest(path, { method, token, body })
    } catch (error) {
      throw new ApiError(
        error.message,
        error.status ?? 500,
        error.code ?? 'MOCK_ERROR',
        error.details,
      )
    }
  }
  if (!url) throw new Error('VITE_API_URL 환경변수를 설정해 주세요.')

  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }

  const response = await fetch(`${url}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: multipart ? body : JSON.stringify(body) }),
  })
  if (response.status === 204) return undefined

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.error?.message ?? `요청을 처리하지 못했어요. (${response.status})`,
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.error?.details ?? [],
    )
  }
  if (payload?.success !== true) {
    throw new ApiError('서버 응답 형식이 올바르지 않아요.', response.status, 'INVALID_RESPONSE')
  }
  return payload.data
}

const id = (value) => encodeURIComponent(String(value))
const normalizePhone = (phone) => String(phone).replace(/\D/g, '')

// 1. 주문 설정 (가격, 계좌, 날짜 및 업로드 제한)
export const getOrderConfig = () => request('/order-config')

// 2. 템플릿 목록. anniversaryType: COUPLE | BIRTHDAY | WEDDING | ETC
export function getTemplates(anniversaryType) {
  const query = anniversaryType ? `?${new URLSearchParams({ anniversaryType })}` : ''
  return request(`/templates${query}`)
}

// 3. 템플릿 상세 (문서별 슬롯 수와 위치 안내)
export const getTemplate = (templateId) => request(`/templates/${id(templateId)}`)

// 4. 주문서 생성. 반환된 draftId/draftToken의 보관은 호출부에서 처리합니다.
export const createDraft = () => request('/drafts', { method: 'POST' })

// 5. 주문서 조회. 제출 후에도 같은 토큰을 사용합니다.
export const getDraft = (draftId, token) => request(`/drafts/${id(draftId)}`, { token })

/**
 * 6. 주문서 부분 저장. null은 비우기, 생략한 필드는 유지합니다.
 * fields: templateId, anniversaryType, anniversaryEtcText, customerName,
 * phone, useStartDate, useEndDate, mainText, subText, validateStep.
 * '다음'일 때만 validateStep(1~3)을 전달합니다.
 */
export function updateDraft(draftId, fields, token) {
  const body = { ...fields }
  if (body.phone != null) body.phone = normalizePhone(body.phone)
  return request(`/drafts/${id(draftId)}`, { method: 'PATCH', token, body })
}

// 8. 이름 + 전화번호 조회. 각 주문서에 새로 발급된 토큰이 반환됩니다.
export const lookupDrafts = (customerName, phone) =>
  request('/drafts/lookup', {
    method: 'POST',
    body: { customerName, phone: normalizePhone(phone) },
  })

/**
 * 9. 미디어 업로드. type: PHOTO | VIDEO, documentNo/slot: 1부터 시작.
 * thumbnail과 durationSec은 영상일 때 선택적으로 전달합니다.
 * multipart Content-Type과 boundary는 브라우저가 설정합니다.
 */
export function uploadMedia(
  draftId,
  { file, type, documentNo, slot, thumbnail, durationSec },
  token,
) {
  const body = new FormData()
  body.append('file', file)
  body.append('type', type)
  body.append('documentNo', String(documentNo))
  body.append('slot', String(slot))
  if (thumbnail != null) body.append('thumbnail', thumbnail)
  if (durationSec != null) body.append('durationSec', String(durationSec))
  return request(`/drafts/${id(draftId)}/media`, { method: 'POST', token, body })
}

// 10. 사진은 { caption }, 영상은 { title }. 빈 문자열은 내용을 지웁니다.
export const updateMedia = (draftId, mediaId, fields, token) =>
  request(`/drafts/${id(draftId)}/media/${id(mediaId)}`, {
    method: 'PATCH',
    token,
    body: fields,
  })

// 11. 미디어 삭제 (성공 시 반환값 없음)
export const deleteMedia = (draftId, mediaId, token) =>
  request(`/drafts/${id(draftId)}/media/${id(mediaId)}`, { method: 'DELETE', token })

// 12. AI 문구 생성. target: MAIN_TEXT | SUB_TEXT. 생성 결과는 자동 저장되지 않습니다.
export const generateAiPhrase = (draftId, { target, inputText }, token) =>
  request(`/drafts/${id(draftId)}/ai-phrases`, {
    method: 'POST',
    token,
    body: { target, inputText },
  })

// 13. 주문서 제출. depositorName 생략 시 주문자 이름을 사용합니다.
export const submitOrder = (draftId, token, depositorName) =>
  request('/orders', { method: 'POST', token, body: { draftId, depositorName } })

// 14. 주문 상태 및 납품 링크 조회
export const getOrder = (orderId, token) => request(`/orders/${id(orderId)}`, { token })

// 15. 요구사항 등록. requestType: REVISION | ADDITION | INQUIRY | ETC (생략 시 ETC)
export const createOrderRequest = (orderId, { content, requestType }, token) =>
  request(`/orders/${id(orderId)}/requests`, {
    method: 'POST',
    token,
    body: { content, requestType },
  })

// 16. 요구사항 목록 (최근 순)
export const getOrderRequests = (orderId, token) =>
  request(`/orders/${id(orderId)}/requests`, { token })
