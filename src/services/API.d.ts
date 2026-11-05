export interface Guide {
  imageUrl: string
  highlight: { x: number; y: number; width: number; height: number }
}
export interface Template {
  formType: 'STANDARD' | 'PEPERO'
  extraMediaFees: boolean
  minLeadDays: number
  captionMaxLength: number
  templateId: number
  name: string
  description: string
  thumbnailUrl: string
  sampleSiteUrl: string | null
  /** 웹사이트 미리보기 팝업 사진(카드 사진과 별도). 없으면 null */
  previewImageUrl?: string | null
  basePrice: number
}
export interface TemplateDetail extends Template {
  guides: { memoryTitle?: Guide; memoryStory?: Guide }
  documents: {
    documentNo: number
    photoSlots: number
    videoSlots: number
    minPhotos: number
    minVideos: number
    photoGuide?: Guide
    videoGuide?: Guide
  }[]
}
export interface OrderConfig {
  bankAccount: { bankName: string; accountNumber: string; accountHolder: string }
  minLeadDays: number
  minUseStartDate: string
  anniversaryTypes: { code: string; label: string }[]
  limits: {
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
  pricing: {
    freePeriodDays: number
    extraPeriodPrice: number
    includedPhotos: number
    extraPhotoUnit: number
    extraPhotoUnitPrice: number
    includedVideos: number
    extraVideoPrice: number
  }
}
export interface Price {
  basePrice: number
  usageDays: number
  periodFee: number
  photoCount: number
  photoFee: number
  videoCount: number
  videoFee: number
  totalPrice: number
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
  mainText: string | null
  draftId: number
  orderNo: string | null
  status: string
  currentStep: number
  template: { templateId: number; name: string } | null
  anniversaryType: string | null
  anniversaryEtcText: string | null
  customerName: string | null
  phone: string | null
  recipientName: string | null
  useStartDate: string | null
  useEndDate: string | null
  specialDay: string | null
  specialPlace: string | null
  specialOccasion: string | null
  musics: Music[]
  letterInput: string | null
  letterAi: string | null
  letterChoice: LetterChoice | null
  letter: string | null
  linkUrl: string | null
  price: Price
  sitePasswordSet: boolean
  sitePasswordHint: string | null
  documents: { documentNo: number; photos: Media[]; videos: Media[] }[]
  updatedAt: string
}
export interface DraftFields {
  mainText?: string | null
  templateId?: number | null
  anniversaryType?: string | null
  anniversaryEtcText?: string | null
  customerName?: string | null
  phone?: string | null
  useStartDate?: string | null
  useEndDate?: string | null
  specialDay?: string | null
  specialPlace?: string | null
  specialOccasion?: string | null
  musics?: Music[] | null
  letterInput?: string | null
  letterAi?: string | null
  letterChoice?: LetterChoice | null
  linkUrl?: string | null
  recipientName?: string | null
  sitePasswordHint?: string | null
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
export type LetterChoice = 'ORIGINAL' | 'AI'
export interface LetterDraft {
  letterInput: string
  letterAi: string
  letterChoice: LetterChoice | null
  remainingCount: number
}
/** AI 편지 다듬기. 서버가 원문과 AI 결과를 저장하고 선택 상태를 초기화합니다. */
export function generateAiLetter(
  draftId: number,
  letterInput: string,
  token: string,
): Promise<LetterDraft>
export interface SiteSession {
  siteAccessToken: string
  expiresAt: string
}
/** 잠금 화면에 띄울 정보. 비밀번호 없이 받습니다. */
export interface SiteLock {
  recipientName: string | null
  passwordHint: string | null
}
export type SiteContent = Pick<
  Draft,
  | 'recipientName'
  | 'mainText'
  | 'specialDay'
  | 'specialPlace'
  | 'specialOccasion'
  | 'musics'
  | 'letter'
  | 'linkUrl'
  | 'documents'
  | 'anniversaryType'
  | 'anniversaryEtcText'
  | 'useStartDate'
  | 'useEndDate'
> & { templateId: number }
export function getSiteLock(siteKey: string): Promise<SiteLock>
export function unlockSite(siteKey: string, password: string): Promise<SiteSession>
export function getSite(siteKey: string, token: string): Promise<SiteContent>
