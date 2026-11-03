export interface Guide {
  imageUrl: string
  highlight: { x: number; y: number; width: number; height: number }
}
export interface Template {
  templateId: number
  name: string
  description: string
  thumbnailUrl: string
  sampleSiteUrl: string | null
}
export interface TemplateDetail extends Template {
  guides: { memoryTitle?: Guide; memoryStory?: Guide }
  documents: {
    documentNo: number
    photoSlots: number
    videoSlots: number
    minPhotos: number
    photoGuide?: Guide
    videoGuide?: Guide
  }[]
}
export interface OrderConfig {
  price: number
  bankAccount: { bankName: string; accountNumber: string; accountHolder: string }
  minLeadDays: number
  minUseStartDate: string
  anniversaryTypes: { code: string; label: string }[]
  limits: {
    memoryInputMinLength: number
    memoryInputMaxLength: number
    letterInputMinLength?: number
    letterMaxLength: number
    captionMaxLength: number
    videoTitleMaxLength: number
    photoMaxSizeMb: number
    videoMaxSizeMb: number
    videoMaxDurationSec: number
    photoTypes: string[]
    videoTypes: string[]
  }
}
export interface Session {
  draftId: number
  draftToken: string
}
export interface DraftMatch extends Session {
  orderNo: string | null
  status: string
  templateName: string | null
  currentStep: number
  updatedAt: string
}
export interface Media {
  mediaId: number
  type: 'PHOTO' | 'VIDEO'
  documentNo: number
  slot: number
  url: string
  thumbnailUrl: string | null
  durationSec: number | null
  caption: string | null
  title: string | null
}
export interface Draft {
  draftId: number
  orderNo: string | null
  status: string
  currentStep: number
  template: { templateId: number; name: string } | null
  anniversaryType: string | null
  anniversaryEtcText: string | null
  customerName: string | null
  phone: string | null
  useStartDate: string | null
  useEndDate: string | null
  memoryInput: string | null
  musics: Music[]
  letters: Letter[]
  sitePasswordSet: boolean
  memoryTitle: string | null
  memoryStory: string | null
  documents: { documentNo: number; photos: Media[]; videos: Media[] }[]
  updatedAt: string
}
export interface DraftFields {
  templateId?: number | null
  anniversaryType?: string | null
  anniversaryEtcText?: string | null
  customerName?: string | null
  phone?: string | null
  useStartDate?: string | null
  useEndDate?: string | null
  memoryInput?: string | null
  musics?: Music[] | null
  letters?: Letter[] | null
  sitePassword?: string
  validateStep?: number
}
export interface Order {
  orderId: number
  orderNo: string
  status: string
  payStatus: string
  totalPrice: number
  depositorName: string
  bankAccount: OrderConfig['bankAccount']
  depositDeadline: string
  templateName: string
  anniversaryType: string
  customerName: string
  phone: string
  useStartDate: string
  useEndDate: string | null
  submittedAt: string
  siteUrl?: string
}
export interface OrderRequest {
  requestId: number
  requestType: string
  content: string
  status: string
  adminReply: string | null
  requestedAt: string
  doneAt: string | null
}
export class ApiError extends Error {
  status: number
  code: string
  details: { field: string; reason: string; value?: number }[]
}
export function getOrderConfig(): Promise<OrderConfig>
export function getTemplates(anniversaryType?: string): Promise<Template[]>
export function getTemplate(templateId: number): Promise<TemplateDetail>
export function createDraft(): Promise<Session & { currentStep: number }>
export function getDraft(draftId: number, token: string): Promise<Draft>
export function updateDraft(draftId: number, fields: DraftFields, token: string): Promise<Draft>
export function lookupDrafts(customerName: string, phone: string): Promise<DraftMatch[]>
export function uploadMedia(
  draftId: number,
  fields: {
    file: File
    type: string
    documentNo: number
    slot: number
    thumbnail?: Blob
    durationSec?: number
  },
  token: string,
): Promise<Media>
export function updateMedia(
  draftId: number,
  mediaId: number,
  fields: { caption?: string; title?: string },
  token: string,
): Promise<Media>
export function deleteMedia(draftId: number, mediaId: number, token: string): Promise<void>
export function submitOrder(draftId: number, token: string, depositorName?: string): Promise<Order>
export function getOrder(orderId: number, token: string): Promise<Order>
export function createOrderRequest(
  orderId: number,
  fields: { content: string; requestType?: string },
  token: string,
): Promise<OrderRequest>
export function getOrderRequests(orderId: number, token: string): Promise<OrderRequest[]>

export interface Music {
  title: string
  artist: string
  youtubeUrl?: string | null
}
export interface Letter {
  /** AI로 다듬기 전 원문. 직접 쓴 편지면 null. 완성 사이트 응답에는 없습니다. */
  input?: string | null
  /** 사이트에 띄울 최종 편지 */
  content: string
}
export interface LetterDraft {
  input: string
  content: string
  remainingCount: number
}
/** 12-1. AI 편지 다듬기. 저장하지 않으니 결과를 letters에 넣어 updateDraft로 저장합니다. */
export function generateAiLetter(
  draftId: number,
  letterInput: string,
  token: string,
): Promise<LetterDraft>
export interface Story {
  memoryInput: string
  memoryTitle: string
  memoryStory: string
  remainingCount: number
}
export function generateAiStory(draftId: number, memoryInput: string, token: string): Promise<Story>
export interface SiteSession {
  siteAccessToken: string
  expiresAt: string
}
export type SiteContent = Pick<
  Draft,
  | 'memoryTitle'
  | 'memoryStory'
  | 'musics'
  | 'letters'
  | 'documents'
  | 'anniversaryType'
  | 'anniversaryEtcText'
  | 'useStartDate'
  | 'useEndDate'
> & { templateId: number }
export function unlockSite(siteKey: string, password: string): Promise<SiteSession>
export function getSite(siteKey: string, token: string): Promise<SiteContent>
