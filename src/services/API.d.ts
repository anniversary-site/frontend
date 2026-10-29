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
  guides: { mainText?: Guide; subText?: Guide }
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
    mainTextMaxLength: number
    subTextMaxLength: number
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
  mainText: string | null
  subText: string | null
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
  mainText?: string | null
  subText?: string | null
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
export function generateAiPhrase(
  draftId: number,
  fields: { target: string; inputText?: string },
  token: string,
): Promise<{ target: string; text: string }>
export function submitOrder(draftId: number, token: string, depositorName?: string): Promise<Order>
export function getOrder(orderId: number, token: string): Promise<Order>
export function createOrderRequest(
  orderId: number,
  fields: { content: string; requestType?: string },
  token: string,
): Promise<OrderRequest>
export function getOrderRequests(orderId: number, token: string): Promise<OrderRequest[]>
