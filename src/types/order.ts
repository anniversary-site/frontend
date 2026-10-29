import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import type {
  DraftMatch,
  Order,
  OrderConfig,
  Session,
  Template,
  TemplateDetail,
} from '../services/API'

export type Page = 'main' | 'start' | 'load' | 'template' | 'info' | 'content' | 'review' | 'done'
export type Occasion = '연애 기념일' | '생일' | '결혼 기념일' | '기타'
export type PhraseField = 'main' | 'sub'
export type MediaKind = 'photos' | 'videos'
export type PreviewTarget = PhraseField | MediaKind

export interface OrderData {
  template: number
  occasion: Occasion
  other: string
  name: string
  phone: string
  date: string
  endDate: string
  main: string
  sub: string
}

export interface MediaItem {
  mediaId?: number
  documentNo?: number
  slot?: number
  file: File
  url: string
  text: string
  status: 'loading' | 'ready' | 'error'
  error: string
  progress: number
  duration?: string
}

export type MediaFiles = Record<MediaKind, (MediaItem | null)[]>
export type PhraseValues = Partial<Record<PhraseField, string>>
export type PhraseFlags = Partial<Record<PhraseField, boolean>>
export type TouchedFields = Partial<Record<'name' | 'phone', boolean>>
export type Sheet =
  | { type: 'caption'; kind: MediaKind; index: number }
  | { type: 'guide' }
  | { type: 'save-draft' }
  | { type: 'position'; target: PreviewTarget; documentNo?: number }
  | { type: 'preview'; target?: undefined }

export interface SavedDraft {
  data: OrderData
  files: MediaFiles
  page: 'template' | 'info' | 'content'
  savedAt: string
}

type Setter<T> = Dispatch<SetStateAction<T>>

export interface OrderContextValue {
  data: OrderData
  setData: Setter<OrderData>
  files: MediaFiles
  setFiles: Setter<MediaFiles>
  suggestions: PhraseValues
  setSuggestions: Setter<PhraseValues>
  generating: PhraseFlags
  aiErrors: PhraseFlags
  touched: TouchedFields
  setTouched: Setter<TouchedFields>
  setAiErrors: Setter<PhraseFlags>
  page: Page
  error: string
  next: (event: FormEvent<HTMLFormElement>) => void
  update: <K extends keyof OrderData>(key: K, value: OrderData[K]) => void
  go: (page: Page) => void
  open: (sheet: Sheet) => void
  load: (name: string, phone: string) => Promise<DraftMatch[]>
  selectDraft: (draft: DraftMatch) => Promise<void>
  startDraft: () => Promise<void>
  resumeDraft: () => Promise<void>
  session: Session | null
  busy: boolean
  config: OrderConfig | null
  templates: Template[]
  templateDetail: TemplateDetail | null
  order: Order | null
  setToast: Setter<string>
  setError: Setter<string>
  generate: (key: PhraseField) => void
  applySuggestion: (key: PhraseField) => Promise<void>
  reportError: (cause: unknown) => string
  mediaSection: (kind: MediaKind) => ReactNode
  INITIAL: OrderData
  OCCASIONS: readonly Occasion[]
  emptyFiles: () => MediaFiles
}
