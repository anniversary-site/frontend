import type { FormEvent } from 'react'
import type {
  MediaFiles,
  MediaItem,
  MediaKind,
  Occasion,
  OrderData,
  Page,
  PhraseField,
  PhraseFlags,
  PhraseValues,
  Sheet,
  TouchedFields,
} from './types/order'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import './App.css'
import Icon from './components/Icon'
import Button from './components/Button'
import PositionPreview from './components/PositionPreview'
import SaveDraftDialog from './components/SaveDraftDialog'
import * as api from './services/API.js'
import type {
  Draft,
  DraftFields,
  DraftMatch,
  Order,
  OrderConfig,
  Session,
  Template,
  TemplateDetail,
} from './services/API'
import { canProceed, mediaDuration, dateKey, minDate, formatPhone } from './utils/order'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { OrderContext } from './context/OrderContext'
import { PAGE_PATHS, pageFromPath } from './routes/paths'
import AppRoutes from './routes/AppRoutes'
import { addDays, FREE_PERIOD_DAYS } from './utils/period'
import { videoMetadata } from './utils/video'

// 화면 시연에 사용하는 초기 데이터와 날짜 유틸리티
const INITIAL: OrderData = {
  template: -1,
  occasion: '연애 기념일',
  other: '',
  name: '',
  phone: '',
  date: dateKey(minDate()),
  endDate: addDays(dateKey(minDate()), FREE_PERIOD_DAYS - 1),
  main: '',
  sub: '',
}
const OCCASIONS: Occasion[] = ['연애 기념일', '생일', '결혼 기념일', '기타']
const emptyFiles = (): MediaFiles => ({ photos: Array(4).fill(null), videos: Array(4).fill(null) })
const SESSION_KEY = `urluv-session-${import.meta.env.VITE_USE_BACKEND === 'true' ? 'backend' : 'mock'}`
function readSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return Number.isInteger(value?.draftId) && typeof value?.draftToken === 'string' ? value : null
  } catch {
    return null
  }
}
const occasionCodes: Record<Occasion, string> = {
  '연애 기념일': 'COUPLE',
  생일: 'BIRTHDAY',
  '결혼 기념일': 'WEDDING',
  기타: 'ETC',
}

export default function App() {
  // 페이지와 입력 상태
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageFromPath(location.pathname)
  const [data, setData] = useState<OrderData>({ ...INITIAL })
  const [files, setFiles] = useState<MediaFiles>(emptyFiles)
  const [suggestions, setSuggestions] = useState<PhraseValues>({})
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [caption, setCaption] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [session, setSession] = useState<Session | null>(readSession)
  const sessionRef = useRef(session)
  const [config, setConfig] = useState<OrderConfig | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const saveLock = useRef(false)
  const [direction, setDirection] = useState('forward')
  const [generating, setGenerating] = useState<PhraseFlags>({})
  const [aiErrors, setAiErrors] = useState<PhraseFlags>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const isPreview = sheet?.type === 'position' || sheet?.type === 'preview'
  const swipeStart = useRef<number | null>(null)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const ready = Boolean(
    config &&
    templateDetail &&
    templateDetail.templateId === data.template &&
    canProceed(page, data, config.minUseStartDate) &&
    Object.values(files)
      .flat()
      .every((item) => !item || item.status === 'ready') &&
    (page !== 'content' ||
      templateDetail.documents.every(
        (doc) =>
          files.photos.filter(
            (item) => item?.status === 'ready' && item.documentNo === doc.documentNo,
          ).length >= doc.minPhotos,
      )),
  )
  const urls = useRef(new Set<string>()),
    dialog = useRef<HTMLElement | null>(null),
    opener = useRef<HTMLElement | null>(null)
  const steps: Partial<Record<Page, number>> = { template: 1, info: 2, content: 3, review: 4 }
  const step = steps[page]
  const update = <K extends keyof OrderData>(key: K, value: OrderData[K]) =>
    setData((d) => ({ ...d, [key]: value }))
  const go = (p: Page) => {
    const pages: Page[] = ['main', 'start', 'load', 'template', 'info', 'content', 'review', 'done']
    setDirection(pages.indexOf(p) < pages.indexOf(page) ? 'backward' : 'forward')
    setError('')
    navigate(PAGE_PATHS[p] || PAGE_PATHS.main)
  }
  const rememberSession = (value: Session | null) => {
    sessionRef.current = value
    setSession(value)
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      setToast('이 브라우저에서는 주문서 접근 정보를 보관할 수 없어요.')
    }
  }
  const handleError = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.'
    if (cause instanceof api.ApiError) {
      if (cause.code === 'INVALID_DRAFT_TOKEN' || cause.code === 'DRAFT_NOT_FOUND') {
        rememberSession(null)
        go('start')
      } else if (cause.code === 'ALREADY_SUBMITTED') {
        go('done')
      } else if (cause.code === 'INVALID_USE_START_DATE' || cause.code === 'INVALID_USE_END_DATE') {
        go('info')
      } else {
        const stage = cause.details?.find((detail) => detail.value)?.value
        if (stage) go(stage === 1 ? 'template' : stage === 2 ? 'info' : 'content')
      }
    }
    setError(message)
    setToast(message)
    return message
  }
  const requireSession = () => {
    if (!sessionRef.current) throw new Error('주문서를 먼저 생성하거나 불러와 주세요.')
    return sessionRef.current
  }
  const reportEffectError = useEffectEvent(handleError)
  const navigateFromEffect = useEffectEvent(go)
  const slotsFor = (detail: TemplateDetail, kind: MediaKind) =>
    detail.documents.flatMap((doc) =>
      Array.from({ length: kind === 'photos' ? doc.photoSlots : doc.videoSlots }, (_, i) => ({
        documentNo: doc.documentNo,
        slot: i + 1,
      })),
    )
  const applyDraft = async (draft: Draft) => {
    const detail = draft.template ? await api.getTemplate(draft.template.templateId) : null
    setTemplateDetail(detail)
    const restored: MediaFiles = { photos: [], videos: [] }
    for (const kind of ['photos', 'videos'] as const) {
      restored[kind] = detail
        ? slotsFor(detail, kind).map((position) => {
            const media = draft.documents
              .find((doc) => doc.documentNo === position.documentNo)
              ?.[kind].find((item) => item.slot === position.slot)
            return media
              ? {
                  ...position,
                  mediaId: media.mediaId,
                  file: new File([], 'restored'),
                  url: media.url,
                  text: (kind === 'photos' ? media.caption : media.title) ?? '',
                  status: 'ready',
                  error: '',
                  progress: 100,
                  duration:
                    media.durationSec == null ? undefined : mediaDuration(media.durationSec),
                }
              : null
          })
        : []
    }
    setFiles(restored)
    setData({
      template: draft.template?.templateId ?? -1,
      occasion:
        (Object.keys(occasionCodes) as Occasion[]).find(
          (key) => occasionCodes[key] === draft.anniversaryType,
        ) ?? '연애 기념일',
      other: draft.anniversaryEtcText ?? '',
      name: draft.customerName ?? '',
      phone: formatPhone(draft.phone ?? ''),
      date: draft.useStartDate ?? '',
      endDate: draft.useEndDate ?? '',
      main: draft.mainText ?? '',
      sub: draft.subText ?? '',
    })
  }
  const fields = (): DraftFields => ({
    templateId: data.template >= 0 ? data.template : null,
    anniversaryType: occasionCodes[data.occasion],
    anniversaryEtcText: data.occasion === '기타' ? data.other : null,
    customerName: data.name || null,
    phone: data.phone || null,
    useStartDate: data.date || null,
    useEndDate: data.endDate || null,
    mainText: data.main || null,
    subText: data.sub || null,
  })
  const needsOrderData = page !== 'main'
  useEffect(() => {
    if (!needsOrderData) return
    let active = true
    Promise.all([api.getOrderConfig(), api.getTemplates()])
      .then(async ([settings, list]) => {
        if (!active) return
        setConfig(settings)
        setTemplates(list)
        setData((current) => ({
          ...current,
          date: current.date || settings.minUseStartDate,
          endDate: current.endDate || addDays(settings.minUseStartDate, 6),
        }))
        const saved = sessionRef.current
        if (saved) {
          const draft = await api.getDraft(saved.draftId, saved.draftToken)
          if (!active) return
          await applyDraft(draft)
          if (draft.status !== 'DRAFT') {
            const submitted = await api.getOrder(saved.draftId, saved.draftToken)
            if (active) {
              setOrder(submitted)
              if (!['main', 'start', 'load'].includes(page)) navigateFromEffect('done')
            }
          }
        }
      })
      .catch((cause) => {
        if (active) reportEffectError(cause)
      })
      .finally(() => {
        if (active) setInitialized(true)
      })
    return () => {
      active = false
    }
  }, [needsOrderData])
  useEffect(() => {
    if (!initialized) return
    if (['template', 'info', 'content', 'review', 'done'].includes(page) && !sessionRef.current)
      navigateFromEffect('start')
  }, [page, initialized, session])
  useEffect(() => {
    if (!initialized || page !== 'done' || !session || order) return
    let active = true
    api
      .getOrder(session.draftId, session.draftToken)
      .then((result) => {
        if (active) setOrder(result)
      })
      .catch((cause) => {
        if (active) {
          navigateFromEffect('start')
          reportEffectError(cause)
        }
      })
    return () => {
      active = false
    }
  }, [page, initialized, session, order])
  // 템플릿 선택은 기존 버튼에서 유지하고 상세 정보만 API로 채웁니다.
  useEffect(() => {
    if (data.template < 0 || templateDetail?.templateId === data.template) return
    let active = true
    api
      .getTemplate(data.template)
      .then((detail) => {
        if (!active) return
        setTemplateDetail(detail)
        setFiles((current) => ({
          photos: slotsFor(detail, 'photos').map(
            (position) =>
              current.photos.find(
                (item) => item?.documentNo === position.documentNo && item.slot === position.slot,
              ) ?? null,
          ),
          videos: slotsFor(detail, 'videos').map(
            (position) =>
              current.videos.find(
                (item) => item?.documentNo === position.documentNo && item.slot === position.slot,
              ) ?? null,
          ),
        }))
      })
      .catch((cause) => {
        if (active) reportEffectError(cause)
      })
    return () => {
      active = false
    }
  }, [data.template])
  const startDraft = async () => {
    if (saveLock.current) return
    saveLock.current = true
    setBusy(true)
    try {
      const created = await api.createDraft()
      rememberSession(created)
      setOrder(null)
      setTouched({})
      setAiErrors({})
      setSuggestions({})
      setData({
        ...INITIAL,
        template: templates[0]?.templateId ?? -1,
        date: config?.minUseStartDate ?? '',
        endDate: addDays(config?.minUseStartDate ?? '', 6),
      })
      setTemplateDetail(null)
      setFiles(emptyFiles())
      go('template')
    } catch (cause) {
      handleError(cause)
    } finally {
      saveLock.current = false
      setBusy(false)
    }
  }
  const resumeDraft = async () => {
    setBusy(true)
    try {
      const saved = requireSession()
      const draft = await api.getDraft(saved.draftId, saved.draftToken)
      await applyDraft(draft)
      if (draft.status !== 'DRAFT') {
        setOrder(await api.getOrder(saved.draftId, saved.draftToken))
        go('done')
      } else
        go(
          draft.currentStep === 1
            ? 'template'
            : draft.currentStep === 2
              ? 'info'
              : draft.currentStep === 3
                ? 'content'
                : 'review',
        )
    } catch (cause) {
      handleError(cause)
    } finally {
      setBusy(false)
    }
  }
  const open = (value: Sheet) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSheet(value)
  }
  const close = () => {
    setSheet(null)
    opener.current?.focus()
  }
  useEffect(() => {
    const created = urls.current
    return () => {
      created.forEach((u) => URL.revokeObjectURL(u))
      timers.current.forEach(clearTimeout)
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const items = () => [
      ...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,input') ??
        []),
    ]
    items()[0]?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheet(null)
        opener.current?.focus()
      }
      if (e.key === 'Tab') {
        const list = items(),
          first = list[0],
          last = list.at(-1)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', key)
    }
  }, [sheet])
  // 모바일 키보드 위에 바텀시트 배치 및 입력창 가림 방지
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => {
      const offset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0
      document.documentElement.style.setProperty('--keyboard-offset', offset + 'px')
    }
    const focus = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.matches('input, textarea')) {
        requestAnimationFrame(() => target.scrollIntoView({ block: 'center', behavior: 'auto' }))
      }
    }
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    document.addEventListener('focusin', focus)
    resize()
    return () => {
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      document.removeEventListener('focusin', focus)
      document.documentElement.style.removeProperty('--keyboard-offset')
    }
  }, [])
  const previousPage = useRef(page)
  useEffect(() => {
    const pages = Object.keys(PAGE_PATHS)
    setDirection(pages.indexOf(page) < pages.indexOf(previousPage.current) ? 'backward' : 'forward')
    previousPage.current = page
    setSheet(null)
    setError('')
    window.scrollTo(0, 0)
  }, [page])
  // 첨부 파일은 서버 전송 없이 현재 화면에서만 미리보기
  const objectUrl = (file: File) => {
    const url = URL.createObjectURL(file)
    urls.current.add(url)
    return url
  }
  const updateFile = (kind: MediaKind, index: number, url: string, changes: Partial<MediaItem>) => {
    setFiles((state) => ({
      ...state,
      [kind]: state[kind].map((item, i) =>
        i === index && item !== null && item.url === url ? { ...item, ...changes } : item,
      ),
    }))
  }
  const upload = async (kind: MediaKind, index: number, file: File | undefined) => {
    if (!file || !templateDetail || !config) return
    const position = slotsFor(templateDetail, kind)[index]
    if (!position) return
    const url = objectUrl(file)
    setFiles((state) => ({
      ...state,
      [kind]: state[kind].map((old, i) =>
        i === index
          ? {
              ...position,
              file,
              url,
              text: '',
              status: 'loading',
              error: '',
              progress: 0,
            }
          : old,
      ),
    }))
    try {
      const saved = requireSession()
      const limits = config.limits
      const photo = kind === 'photos'
      if (!(photo ? limits.photoTypes : limits.videoTypes).includes(file.type))
        throw new Error('파일 형식을 확인해 주세요.')
      if (file.size > (photo ? limits.photoMaxSizeMb : limits.videoMaxSizeMb) * 1024 * 1024)
        throw new Error('파일 용량 제한을 초과했어요.')
      let video: { durationSec?: number; thumbnail?: Blob } = {}
      if (!photo) video = await videoMetadata(file, limits.videoMaxDurationSec)
      const result = await api.uploadMedia(
        saved.draftId,
        { file, type: photo ? 'PHOTO' : 'VIDEO', ...position, ...video },
        saved.draftToken,
      )
      updateFile(kind, index, url, {
        mediaId: result.mediaId,
        status: 'ready',
        progress: 100,
        duration: result.durationSec == null ? undefined : mediaDuration(result.durationSec),
      })
    } catch (cause) {
      updateFile(kind, index, url, { status: 'error', error: handleError(cause) })
    }
  }
  const persistDraft = async (phone: string): Promise<boolean> => {
    if (saveLock.current) return false
    saveLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      const saved = requireSession()
      if (
        Object.values(files)
          .flat()
          .some((item) => item && item.status !== 'ready')
      )
        throw new Error('첨부 파일 처리를 완료해 주세요.')
      await api.updateDraft(saved.draftId, { ...fields(), phone: phone || null }, saved.draftToken)
      update('phone', formatPhone(phone))
      setToast(
        data.name && phone
          ? '주문서를 저장했어요. 이름과 전화번호로 다시 불러올 수 있어요.'
          : '주문서를 저장했어요. 이 브라우저에서 이어서 작성할 수 있어요.',
      )
      return true
    } catch (cause) {
      setSaveError(handleError(cause))
      return false
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }
  const save = () => {
    void persistDraft(data.phone)
  }
  const selectDraft = async (match: DraftMatch) => {
    rememberSession(match)
    const draft = await api.getDraft(match.draftId, match.draftToken)
    await applyDraft(draft)
    setSuggestions({})
    setAiErrors({})
    setTouched({})
    setGenerating({})
    if (draft.status !== 'DRAFT') {
      setOrder(await api.getOrder(match.draftId, match.draftToken))
      go('done')
    } else
      go(
        draft.currentStep === 1
          ? 'template'
          : draft.currentStep === 2
            ? 'info'
            : draft.currentStep === 3
              ? 'content'
              : 'review',
      )
  }
  const load = async (name: string, phone: string): Promise<DraftMatch[]> => {
    try {
      const matches = await api.lookupDrafts(name, phone)
      // 조회 시 모든 기존 토큰이 교체되므로 선택 전에도 현재 주문의 토큰을 갱신합니다.
      const current = matches.find((item) => item.draftId === sessionRef.current?.draftId)
      if (current) rememberSession(current)
      return matches
    } catch (cause) {
      handleError(cause)
      throw cause
    }
  }
  const next = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!ready || saveLock.current) return
    saveLock.current = true
    setSaving(true)
    try {
      const saved = requireSession()
      const result = await api.updateDraft(
        saved.draftId,
        { ...fields(), validateStep: page === 'template' ? 1 : page === 'info' ? 2 : 3 },
        saved.draftToken,
      )
      if (page === 'content') {
        await applyDraft(await api.getDraft(saved.draftId, saved.draftToken))
        setConfig(await api.getOrderConfig())
      } else if (page === 'template') await applyDraft(result)
      go(page === 'template' ? 'info' : page === 'info' ? 'content' : 'review')
    } catch (cause) {
      handleError(cause)
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }
  const generate = async (key: PhraseField) => {
    if (!data[key].trim() || generating[key]) return
    setGenerating((state) => ({ ...state, [key]: true }))
    setAiErrors((state) => ({ ...state, [key]: false }))
    try {
      const saved = requireSession()
      await api.updateDraft(saved.draftId, fields(), saved.draftToken)
      const result = await api.generateAiPhrase(
        saved.draftId,
        { target: key === 'main' ? 'MAIN_TEXT' : 'SUB_TEXT', inputText: data[key] },
        saved.draftToken,
      )
      setSuggestions((state) => ({ ...state, [key]: result.text }))
    } catch (cause) {
      handleError(cause)
      setAiErrors((state) => ({ ...state, [key]: true }))
    } finally {
      setGenerating((state) => ({ ...state, [key]: false }))
    }
  }
  const removeMedia = async (kind: MediaKind, index: number) => {
    const item = files[kind][index]
    if (!item || item.status === 'loading') return
    try {
      if (item.mediaId) {
        const saved = requireSession()
        await api.deleteMedia(saved.draftId, item.mediaId, saved.draftToken)
      }
      setFiles((state) => ({
        ...state,
        [kind]: state[kind].map((old, i) => (i === index ? null : old)),
      }))
    } catch (cause) {
      handleError(cause)
    }
  }
  const saveCaption = async () => {
    if (sheet?.type !== 'caption' || saving) return
    const item = files[sheet.kind][sheet.index]
    if (!item?.mediaId) return
    setSaving(true)
    try {
      const saved = requireSession()
      await api.updateMedia(
        saved.draftId,
        item.mediaId,
        sheet.kind === 'photos' ? { caption } : { title: caption },
        saved.draftToken,
      )
      updateFile(sheet.kind, sheet.index, item.url, { text: caption })
      close()
    } catch (cause) {
      handleError(cause)
    } finally {
      setSaving(false)
    }
  }
  const submit = async () => {
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true)
    try {
      const saved = requireSession()
      setOrder(await api.submitOrder(saved.draftId, saved.draftToken))
      go('done')
    } catch (cause) {
      handleError(cause)
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }
  const editCaption = (kind: MediaKind, index: number) => {
    const item = files[kind][index]
    if (!item) return
    setCaption(item.text)
    open({ type: 'caption', kind, index })
  }
  const applySuggestion = async (key: PhraseField) => {
    const suggestion = suggestions[key]
    if (!suggestion || saving) return
    setSaving(true)
    try {
      const saved = requireSession()
      await api.updateDraft(
        saved.draftId,
        key === 'main' ? { mainText: suggestion } : { subText: suggestion },
        saved.draftToken,
      )
      update(key, suggestion)
      setSuggestions((current) => {
        const result = { ...current }
        delete result[key]
        return result
      })
    } catch (cause) {
      handleError(cause)
    } finally {
      setSaving(false)
    }
  }
  const back = () => {
    const previousPages: Partial<Record<Page, Page>> = {
      template: 'start',
      info: 'template',
      content: 'info',
      review: 'content',
    }
    const previous = previousPages[page]
    if (previous) go(previous)
  }
  const mediaSection = (kind: MediaKind) =>
    templateDetail?.documents.map((doc) => (
      <section key={doc.documentNo} className={`content-section uploads ${kind}`}>
        <div className="section-heading">
          <h2>
            document {doc.documentNo} {kind === 'photos' ? '사진' : '영상'} 업로드
          </h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: kind, documentNo: doc.documentNo })}
          >
            {kind === 'photos' ? '사진' : '영상'} 위치 보러가기 <Icon name="next" small />
          </button>
        </div>
        <div className="media-grid">
          {files[kind].map(
            (item, index) =>
              slotsFor(templateDetail, kind)[index]?.documentNo === doc.documentNo && (
                <div className="media-item" key={index}>
                  <div className={`media-tile ${item ? 'filled' : ''} ${item?.status || ''}`}>
                    {!item ? (
                      <label className="upload-label">
                        <Icon name="plus" />
                        <span className="sr-only">{kind === 'photos' ? '사진' : '영상'} 추가</span>
                        <input
                          type="file"
                          accept={kind === 'photos' ? 'image/*' : 'video/*'}
                          aria-label={`${kind === 'photos' ? '사진' : '영상'} ${index + 1} 추가`}
                          onChange={(event) => {
                            upload(kind, index, event.target.files?.[0])
                            event.target.value = ''
                          }}
                        />
                      </label>
                    ) : item.status === 'error' ? (
                      <div className="upload-failure" role="alert">
                        <small>{item.error}</small>
                        <button
                          type="button"
                          className="small-button"
                          onClick={() => upload(kind, index, item.file)}
                        >
                          다시 시도
                        </button>
                        <label className="replace-file">
                          파일 변경
                          <input
                            type="file"
                            accept={kind === 'photos' ? 'image/*' : 'video/*'}
                            onChange={(event) => upload(kind, index, event.target.files?.[0])}
                          />
                        </label>
                      </div>
                    ) : item.status === 'loading' ? (
                      <div className="upload-progress" role="status">
                        <span className="spinner" />
                        <small>업로드 중</small>
                        <progress max="100" aria-label="파일 업로드 중" />
                      </div>
                    ) : (
                      <>
                        {kind === 'photos' ? (
                          <img
                            src={item.url}
                            alt={`업로드한 사진 ${index + 1}`}
                            onError={() =>
                              updateFile(kind, index, item.url, {
                                status: 'error',
                                error: '미리보기를 표시하지 못했어요.',
                              })
                            }
                          />
                        ) : (
                          <>
                            <video
                              src={item.url}
                              controls
                              preload="metadata"
                              onLoadedMetadata={(event) =>
                                updateFile(kind, index, item.url, {
                                  duration: mediaDuration(event.currentTarget.duration),
                                })
                              }
                              onError={() =>
                                updateFile(kind, index, item.url, {
                                  status: 'error',
                                  error: '영상을 표시하지 못했어요.',
                                })
                              }
                            />
                            <span className="video-play">
                              <Icon name="play" />
                            </span>
                            <small className="video-duration">{item.duration || '0:00'}</small>
                          </>
                        )}
                      </>
                    )}
                    {item && (
                      <button
                        type="button"
                        className="remove-media"
                        aria-label={`${kind === 'photos' ? '사진' : '영상'} ${index + 1} 삭제`}
                        disabled={item.status === 'loading'}
                        onClick={() => removeMedia(kind, index)}
                      >
                        <Icon name="close" small />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="caption-button small-button"
                    disabled={item?.status !== 'ready' || !item?.mediaId}
                    onClick={() => editCaption(kind, index)}
                  >
                    {kind === 'photos' ? '캡션 작성' : '영상 제목 작성'}
                  </button>
                  {item?.text && <p className="media-caption">{item.text}</p>}
                </div>
              ),
          )}
        </div>
      </section>
    ))
  return (
    <OrderContext.Provider
      value={{
        data,
        setData,
        files,
        setFiles,
        suggestions,
        setSuggestions,
        generating,
        aiErrors,
        touched,
        setTouched,
        setAiErrors,
        page,
        error,
        next,
        update,
        go,
        open,
        load,
        setToast,
        setError,
        generate,
        applySuggestion,
        reportError: handleError,
        mediaSection,
        INITIAL,
        OCCASIONS,
        emptyFiles,
        config,
        templates,
        templateDetail,
        session,
        busy,
        order,
        startDraft,
        resumeDraft,
        selectDraft,
      }}
    >
      <div className={`app page-${page} direction-${direction}`}>
        {(page === 'main' || page === 'start' || page === 'load') && (
          <header className="global-header">
            <div className="global-header-inner">
              <Link className="logo" to={PAGE_PATHS.main}>
                URLUV
              </Link>
              <nav aria-label="메인 메뉴">
                <button onClick={() => open({ type: 'guide' })}>주문서 작성 방법</button>
                <Link to={PAGE_PATHS.start}>주문서 작성</Link>
                <button onClick={() => open({ type: 'preview' })}>웹사이트 미리보기</button>
              </nav>
            </div>
          </header>
        )}

        {step && (
          <>
            <header className={`order-header ${page === 'review' ? 'review-header' : ''}`}>
              <div className="order-header-inner">
                <button className="back-button" onClick={back} aria-label="뒤로가기">
                  <Icon name="back" />
                  {page !== 'review' && '뒤로가기'}
                </button>
                <strong>{page === 'review' ? '주문 상세보기' : '주문서 작성'}</strong>
                <span className="step-count">{step}/4</span>
              </div>
            </header>
            {page !== 'review' && (
              <div className="progress-track" aria-label={`주문서 작성 ${step}/4 단계`}>
                <div style={{ width: `${step * 25}%` }} />
              </div>
            )}
          </>
        )}
        {!initialized && needsOrderData ? <p role="status">주문 정보를 불러오는 중이에요.</p> : <AppRoutes />}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {(step || page === 'done') && (
          <div className="bottom-actions">
            <div className="bottom-actions-inner">
              {page === 'review' ? (
                <button className="button primary" onClick={submit} disabled={saving}>
                  주문 완료
                </button>
              ) : page === 'done' ? (
                <button className="button primary" onClick={() => go('main')}>
                  홈 화면으로 돌아가기
                </button>
              ) : (
                <>
                  <Button className="secondary" onClick={save} loading={saving}>
                    저장하기
                  </Button>
                  <Button
                    className="primary"
                    type="submit"
                    form="order-form"
                    disabled={!ready || saving}
                  >
                    다음
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {toast && (
          <div role="status" className="toast">
            {toast}
          </div>
        )}
        {sheet && (
          <div
            className={`sheet-overlay ${isPreview ? 'preview-overlay' : sheet.type === 'guide' || sheet.type === 'save-draft' ? 'dialog-overlay' : ''}`}
            onClick={close}
          >
            <section
              ref={dialog}
              className={
                isPreview
                  ? 'preview-modal'
                  : sheet.type === 'guide' || sheet.type === 'save-draft'
                    ? 'dialog-panel'
                    : 'bottom-sheet'
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="sheet-heading"
              onClick={(e) => e.stopPropagation()}
            >
              {sheet.type === 'caption' && (
                <div
                  className="sheet-drag-area"
                  onPointerDown={(event) => {
                    swipeStart.current = event.clientY
                    event.currentTarget.setPointerCapture(event.pointerId)
                  }}
                  onPointerUp={(event) => {
                    if (swipeStart.current !== null && event.clientY - swipeStart.current > 64)
                      close()
                    swipeStart.current = null
                  }}
                >
                  <div className="sheet-handle" />
                </div>
              )}
              {sheet.type === 'caption' ? (
                <>
                  <h2 id="sheet-heading">
                    {sheet.kind === 'photos' ? '캡션 작성' : '영상 제목 작성'}
                  </h2>
                  <div className="caption-input">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={
                        sheet.kind === 'photos'
                          ? config?.limits.captionMaxLength
                          : config?.limits.videoTitleMaxLength
                      }
                      placeholder={
                        sheet.kind === 'photos'
                          ? '사진에 어울리는 캡션을 작성해 주세요'
                          : '영상 제목을 작성해 주세요'
                      }
                    />
                    <span
                      className={
                        caption.length >=
                        (sheet.kind === 'photos'
                          ? (config?.limits.captionMaxLength ?? 50)
                          : (config?.limits.videoTitleMaxLength ?? 30))
                          ? 'counter-limit'
                          : undefined
                      }
                    >
                      {caption.length}/
                      {sheet.kind === 'photos'
                        ? config?.limits.captionMaxLength
                        : config?.limits.videoTitleMaxLength}
                    </span>
                  </div>
                  <button className="button primary" disabled={saving} onClick={saveCaption}>
                    완료
                  </button>
                </>
              ) : sheet.type === 'save-draft' ? (
                <SaveDraftDialog
                  initialPhone={data.phone}
                  saving={saving}
                  error={saveError}
                  onSave={persistDraft}
                  onClose={close}
                />
              ) : sheet.type === 'guide' ? (
                <>
                  <h2 id="sheet-heading">주문서 작성 방법</h2>
                  <ol className="guide-list">
                    <li>템플릿과 기념일 종류를 선택해 주세요.</li>
                    <li>주문자 정보와 희망 수령일을 입력해 주세요.</li>
                    <li>문구와 사진, 영상을 채워주세요.</li>
                    <li>마지막으로 주문 내용을 확인해 주세요.</li>
                  </ol>
                  <p className="sheet-note">
                    이름과 전화번호를 저장하면 다른 기기에서도 주문서를 불러올 수 있어요.
                  </p>
                  <button className="button primary" onClick={close}>
                    확인
                  </button>
                </>
              ) : (
                <PositionPreview
                  target={sheet.target}
                  documentNo={sheet.type === 'position' ? sheet.documentNo : undefined}
                  onClose={close}
                />
              )}
            </section>
          </div>
        )}
      </div>
    </OrderContext.Provider>
  )
}
