import type { MediaFiles, MediaItem, MediaKind, OrderData, SavedDraft } from '../types/order'
import { formatPhone, isValidPhone, normalizePhone } from '../utils/order'
import { addDays, FREE_PERIOD_DAYS } from '../utils/period'

interface StoredMedia {
  blob: Blob
  name: string
  lastModified: number
  text: string
  duration?: string
}

interface StoredDraft {
  version: 1
  phone: string
  data: OrderData
  files: Record<MediaKind, (StoredMedia | null)[]>
  page: SavedDraft['page']
  savedAt: string
}

export interface DraftRepository {
  save(draft: Omit<SavedDraft, 'savedAt'>): Promise<void>
  findByPhone(phone: string): Promise<SavedDraft | null>
}

const DATABASE = 'urluv-order-drafts'
const STORE = 'drafts'
const MEDIA_KINDS: MediaKind[] = ['photos', 'videos']

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저에서는 주문서를 저장할 수 없어요.'))
      return
    }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'phone' })
    request.onerror = () =>
      reject(new Error('브라우저 저장소에 접근하지 못했어요. 저장소 설정을 확인해 주세요.'))
    request.onblocked = () => reject(new Error('다른 탭을 닫은 뒤 다시 시도해 주세요.'))
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

function storageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error('브라우저 저장 공간이 부족해요. 첨부 파일 용량을 줄인 뒤 다시 저장해 주세요.')
  }
  return error instanceof Error
    ? error
    : new Error('저장소 처리 중 문제가 발생했어요. 다시 시도해 주세요.')
}

function serialize(draft: Omit<SavedDraft, 'savedAt'>): StoredDraft {
  const phone = normalizePhone(draft.data.phone)
  if (!isValidPhone(phone)) throw new Error('저장할 전화번호를 확인해 주세요.')
  const files: StoredDraft['files'] = { photos: [], videos: [] }
  for (const kind of MEDIA_KINDS) {
    files[kind] = draft.files[kind].map((item) => {
      if (!item) return null
      if (item.status !== 'ready') throw new Error('첨부 파일 처리를 완료한 뒤 저장해 주세요.')
      return {
        blob: item.file,
        name: item.file.name,
        lastModified: item.file.lastModified,
        text: item.text,
        duration: item.duration,
      }
    })
  }
  return {
    version: 1,
    phone,
    data: { ...draft.data, phone: formatPhone(phone) },
    files,
    page: draft.page,
    savedAt: new Date().toISOString(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validateDraft(value: unknown, phone: string): asserts value is StoredDraft {
  const invalid = () => {
    throw new Error('저장된 주문서 형식이 올바르지 않아요. 다시 저장해 주세요.')
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.phone !== phone ||
    !isRecord(value.data) ||
    !isRecord(value.files)
  )
    return invalid()
  const data = value.data
  if (
    typeof data.template !== 'number' ||
    !Number.isInteger(data.template) ||
    data.template < 0 ||
    data.template > 2
  )
    return invalid()
  if (!['연애 기념일', '생일', '결혼 기념일', '기타'].includes(String(data.occasion)))
    return invalid()
  for (const key of ['other', 'name', 'phone', 'date', 'endDate', 'main', 'sub'])
    if (typeof data[key] !== 'string') return invalid()
  if (
    normalizePhone(data.phone as string) !== phone ||
    !['template', 'info', 'content'].includes(String(value.page)) ||
    typeof value.savedAt !== 'string'
  )
    return invalid()
  for (const kind of MEDIA_KINDS) {
    const items = value.files[kind]
    if (!Array.isArray(items) || items.length !== 4) return invalid()
    for (const item of items) {
      if (item === null) continue
      if (
        !isRecord(item) ||
        !(item.blob instanceof Blob) ||
        typeof item.name !== 'string' ||
        typeof item.lastModified !== 'number' ||
        typeof item.text !== 'string'
      )
        return invalid()
    }
  }
}

function hydrate(stored: StoredDraft): SavedDraft {
  const files: MediaFiles = { photos: [], videos: [] }
  const createdUrls: string[] = []
  try {
    for (const kind of MEDIA_KINDS) {
      files[kind] = stored.files[kind].map((item): MediaItem | null => {
        if (!item) return null
        const file = new File([item.blob], item.name, {
          type: item.blob.type,
          lastModified: item.lastModified,
        })
        const url = URL.createObjectURL(file)
        createdUrls.push(url)
        return {
          file,
          url,
          text: item.text,
          duration: item.duration,
          status: 'ready',
          error: '',
          progress: 100,
        }
      })
    }
    return { data: { ...stored.data }, files, page: stored.page, savedAt: stored.savedAt }
  } catch (error) {
    createdUrls.forEach((url) => URL.revokeObjectURL(url))
    throw error
  }
}

// API가 준비되면 이 인터페이스의 구현만 서버 저장·조회로 교체합니다.
export const draftRepository: DraftRepository = {
  async save(draft) {
    const record = serialize(draft)
    const db = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(storageError(tx.error))
        tx.onabort = () => reject(storageError(tx.error))
        tx.objectStore(STORE).put(record)
      })
    } catch (error) {
      throw storageError(error)
    } finally {
      db.close()
    }
  },
  async findByPhone(value) {
    const phone = normalizePhone(value)
    if (!isValidPhone(phone)) throw new Error('전화번호를 확인해 주세요.')
    const db = await openDatabase()
    let record: unknown
    try {
      record = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const request = tx.objectStore(STORE).get(phone)
        let result: unknown
        request.onsuccess = () => {
          result = request.result
        }
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(storageError(tx.error))
        tx.onabort = () => reject(storageError(tx.error))
      })
    } finally {
      db.close()
    }
    if (record === undefined) return null
    // 이전 단일 날짜 주문서는 첫 7일 무료 기간으로 복원합니다.
    if (
      isRecord(record) &&
      isRecord(record.data) &&
      record.data.endDate === undefined &&
      typeof record.data.date === 'string'
    ) {
      record.data.endDate = addDays(record.data.date, FREE_PERIOD_DAYS - 1)
    }
    validateDraft(record, phone)
    return hydrate(record)
  },
}
