import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'

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
  | { type: 'position'; target: PreviewTarget }
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
  load: (phone: string) => Promise<boolean>
  setToast: Setter<string>
  setError: Setter<string>
  generate: (key: PhraseField) => void
  mediaSection: (kind: MediaKind) => ReactNode
  INITIAL: OrderData
  OCCASIONS: readonly Occasion[]
  emptyFiles: () => MediaFiles
}
