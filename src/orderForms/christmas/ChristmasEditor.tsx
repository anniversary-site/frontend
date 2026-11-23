import { useCallback, useEffect, useRef, useState } from 'react'
import { useOrder } from '../../context/OrderContext'
import * as api from '../../services/API'
import { isValidSitePassword } from '../../utils/order'
import type { MediaKind, OrderData } from '../../types/order'
import './ChristmasEditor.css'

type EditorStep = 'login' | 'information' | 'letter' | 'photo' | 'video' | 'music' | 'link'
const CONTENT_STEPS: EditorStep[] = ['information', 'letter', 'photo', 'video', 'music', 'link']
const LABELS: Record<EditorStep, string> = {
  login: '로그인 화면',
  information: 'INFORMATION',
  letter: 'LETTER',
  photo: '사진 폴더',
  video: '영상 폴더',
  music: '음악 창',
  link: '마켓 안내',
}
const HINTS: Record<EditorStep, string> = {
  login: '받는 분이 사이트를 열었을 때 보게 될 화면이에요. 예시를 눌러 직접 입력해 주세요.',
  information: '트리에 있는 우리의 이야기 창을 열어 특별한 날과 장소를 채워 보세요.',
  letter: '편지 우체국 창에서 마음을 적어 보세요. AI 도움을 받아 다듬을 수도 있어요.',
  photo: '사진관의 사진 폴더에 추억을 담아 보세요.',
  video: '사진관의 영상 폴더에 영상을 담을 수 있어요. 이 단계는 건너뛰어도 돼요.',
  music: '캐럴 무대에서 사이트에 넣을 음악을 정해 보세요.',
  link: '마켓 안내판에 연결할 웹 주소를 입력해 주세요.',
}
const CUPID_HINTS: Record<EditorStep, string> = {
  login: '받는 분이 사이트를 열었을 때 보게 될 화면이에요. 예시를 눌러 직접 입력해 주세요.',
  information: 'Our Story 창에서 특별한 날과 장소, 이야기를 채워 보세요.',
  letter: 'Letter 창에서 마음을 적어 보세요. AI 도움을 받아 다듬을 수도 있어요.',
  photo: 'Photo 폴더에 추억을 담아 보세요.',
  video: 'Video 폴더에 영상을 담을 수 있어요. 이 단계는 건너뛰어도 돼요.',
  music: 'Music 폴더에서 사이트에 넣을 음악을 정해 보세요.',
  link: 'Internet 아이콘에 연결할 웹 주소를 입력해 주세요.',
}
const EDITABLE_FIELDS = new Set<keyof OrderData>([
  'recipientName', 'sitePassword', 'sitePasswordHint', 'specialDay', 'specialPlace',
  'specialOccasion', 'letterInput', 'letterAi', 'letterChoice', 'linkUrl', 'musics',
])

function getEditorUrl(templateId: number) {
  if (templateId === 1) return import.meta.env.VITE_CUPID_EDITOR_URL ||
    (import.meta.env.DEV
      ? `${window.location.origin}/cupid-editor/`
      : ['edit.urluv.shop', 'urluv-order.vercel.app'].includes(window.location.hostname)
        ? 'https://anniversary-template-git-develop-anniversary-site.vercel.app/'
        : 'https://cupid.urluv.shop/')
  return import.meta.env.VITE_CHRISTMAS_EDITOR_URL ||
    (import.meta.env.DEV
      ? `${window.location.origin}/christmas-editor/`
      : ['edit.urluv.shop', 'urluv-order.vercel.app'].includes(window.location.hostname)
        ? 'https://anniversary-template-christmas-git-develop-ts-projects4.vercel.app/'
        : 'https://santa.urluv.shop/')
}
const EDITOR_URLS = { 1: getEditorUrl(1), 3: getEditorUrl(3) }
const EDITOR_ORIGINS = { 1: new URL(EDITOR_URLS[1]).origin, 3: new URL(EDITOR_URLS[3]).origin }

function stepIsComplete(step: EditorStep, data: OrderData, photos: number, minPhotos: number) {
  switch (step) {
    case 'login':
      return Boolean(data.recipientName.trim() && (data.sitePasswordSet || isValidSitePassword(data.sitePassword)) &&
        (!data.sitePassword || isValidSitePassword(data.sitePassword)) && data.sitePasswordHint.trim())
    case 'information':
      return Boolean(data.specialDay && data.specialPlace.trim() && data.specialOccasion.trim())
    case 'letter':
      return Boolean(data.letterInput.trim() && data.letterChoice &&
        (data.letterChoice !== 'AI' || data.letterAi.trim()))
    case 'photo': return photos >= minPhotos
    case 'video': return true
    case 'music': return data.musics.length > 0 && data.musics.every((m) => {
      if (!m.title.trim() || !m.artist.trim()) return false
      if (!m.youtubeUrl) return true
      try {
        const url = new URL(m.youtubeUrl)
        return ['http:', 'https:'].includes(url.protocol) && /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/.test(url.hostname)
      } catch { return false }
    })
    case 'link': {
      try { return ['http:', 'https:'].includes(new URL(data.linkUrl).protocol) }
      catch { return false }
    }
  }
}

export default function ChristmasEditor({
  mode,
  templateId,
  onBack,
  onComplete,
}: {
  mode: 'login' | 'content'
  templateId: 1 | 3
  onBack?: () => void
  onComplete?: () => void
}) {
  const {
    data, setData, files, config, templateDetail, session, update, go, setToast, reportError,
    saveDraft, uploadMediaAt, removeMediaAt, setMediaCaptionAt,
  } = useOrder()
  const editorUrl = EDITOR_URLS[templateId]
  const editorOrigin = EDITOR_ORIGINS[templateId]
  const iframe = useRef<HTMLIFrameElement>(null)
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [frameVersion, setFrameVersion] = useState(0)
  const [working, setWorking] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const step = mode === 'login' ? 'login' : CONTENT_STEPS[index]
  const photosReady = files.photos.filter((item) => item?.status === 'ready').length
  const minPhotos = templateDetail?.documents.reduce((sum, doc) => sum + doc.minPhotos, 0) ?? 0
  const complete = stepIsComplete(step, data, photosReady, minPhotos)
  const send = useCallback((type: string, detail: Record<string, unknown> = {}) => {
    iframe.current?.contentWindow?.postMessage({ channel: 'urluv-order-editor', type, ...detail }, editorOrigin)
  }, [editorOrigin])

  useEffect(() => {
    if (loaded) return
    const timer = window.setTimeout(() => setLoadFailed(true), 12000)
    return () => window.clearTimeout(timer)
  }, [loaded, frameVersion])

  useEffect(() => {
    if (!loaded) return
    send('render', {
      step,
      data: {
        recipientName: data.recipientName,
        sitePassword: data.sitePassword,
        sitePasswordSet: data.sitePasswordSet,
        sitePasswordHint: data.sitePasswordHint,
        specialDay: data.specialDay,
        specialPlace: data.specialPlace,
        specialOccasion: data.specialOccasion,
        letterInput: data.letterInput,
        letterAi: data.letterAi,
        letterChoice: data.letterChoice,
        musics: data.musics,
        linkUrl: data.linkUrl,
      },
      media: {
        photos: files.photos.map((item) => item && { name: item.file.name === 'restored' ? '저장한 사진' : item.file.name, status: item.status, text: item.text, url: item.url }),
        videos: files.videos.map((item) => item && { name: item.file.name === 'restored' ? '저장한 영상' : item.file.name, status: item.status, text: item.text, url: item.url }),
      },
      limits: { letterMin: config?.limits.letterInputMinLength ?? 10, minPhotos, captionMaxLength: templateDetail?.captionMaxLength ?? 10 },
    })
  }, [loaded, step, data, files, config, minPhotos, templateDetail, send])

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== editorOrigin || event.source !== iframe.current?.contentWindow) return
      const message = event.data
      if (!message || message.channel !== 'urluv-order-editor') return
      if (message.type === 'ready') { setLoaded(true); setLoadFailed(false); return }
      if (message.type === 'patch' && EDITABLE_FIELDS.has(message.field)) {
        const field = message.field as keyof OrderData
        if (field === 'musics') {
          if (Array.isArray(message.value) && message.value.length <= 20 &&
              message.value.every((music: unknown) => music && typeof (music as Record<string, unknown>).title === 'string' &&
                typeof (music as Record<string, unknown>).artist === 'string' && typeof (music as Record<string, unknown>).youtubeUrl === 'string')) {
            update('musics', message.value)
          }
        } else if (field === 'letterChoice') {
          if (message.value === 'AI' || message.value === 'ORIGINAL') update('letterChoice', message.value)
        } else if (typeof message.value === 'string') {
          setData((current) => ({ ...current, [field]: message.value }))
        }
      }
      if (message.type === 'upload' && message.file instanceof File &&
          (message.kind === 'photos' || message.kind === 'videos') && Number.isInteger(message.index) &&
          message.index >= 0 && message.index < files[message.kind as MediaKind].length) {
        void uploadMediaAt(message.kind as MediaKind, message.index, message.file)
      }
      if (message.type === 'remove' && (message.kind === 'photos' || message.kind === 'videos') && Number.isInteger(message.index) &&
          message.index >= 0 && message.index < files[message.kind as MediaKind].length) {
        void removeMediaAt(message.kind as MediaKind, message.index)
      }
      if (message.type === 'caption' && (message.kind === 'photos' || message.kind === 'videos') &&
          Number.isInteger(message.index) && message.index >= 0 && message.index < files[message.kind as MediaKind].length &&
          typeof message.value === 'string' && message.value.length <= (templateDetail?.captionMaxLength ?? 100)) {
        void setMediaCaptionAt(message.kind as MediaKind, message.index, message.value)
      }
      if (message.type === 'generate-ai' && !aiBusy && session) {
        const raw = data.letterInput.trim()
        const letterMin = config?.limits.letterInputMinLength ?? 10
        if (raw.length < letterMin) { setToast(`편지를 ${letterMin}자 이상 적어 주세요.`); return }
        setAiBusy(true)
        send('ai-status', { busy: true })
        void (async () => {
          try {
            await api.updateDraft(session.draftId, {
              specialDay: data.specialDay || null,
              specialPlace: data.specialPlace || null,
              specialOccasion: data.specialOccasion || null,
            }, session.draftToken)
            const result = await api.generateAiLetter(session.draftId, raw, session.draftToken)
            setData((current) => ({ ...current, letterInput: result.letterInput, letterAi: result.letterAi, letterChoice: result.letterChoice }))
            send('ai-status', { busy: false, remaining: result.remainingCount })
          } catch (cause) { reportError(cause); send('ai-status', { busy: false }) }
          finally { setAiBusy(false) }
        })()
      }
      if (message.type === 'next') document.getElementById('christmas-editor-next')?.click()
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [aiBusy, config, data, editorOrigin, files, removeMediaAt, reportError, send, session, setData, setMediaCaptionAt, setToast, templateDetail, update, uploadMediaAt])

  const next = async () => {
    if (!complete || working) { if (!complete) setToast('이 단계의 필수 내용을 입력해 주세요.'); return }
    if (mode === 'login') { onComplete?.(); return }
    if (index === CONTENT_STEPS.length - 1) {
      if (files.photos.some((item) => item?.status !== 'ready') || files.videos.some((item) => item?.status !== 'ready')) {
        setToast('파일 업로드가 끝난 뒤 확인해 주세요.')
        return
      }
      document.querySelector<HTMLFormElement>('#order-form')?.requestSubmit()
      return
    }
    setWorking(true)
    try {
      if (await saveDraft()) setIndex((current) => current + 1)
    } finally { setWorking(false) }
  }

  const previous = () => {
    if (mode === 'login') onBack?.()
    else if (index > 0) setIndex(index - 1)
    else go('info')
  }

  return (
    <div className={`christmas-editor${templateId === 1 ? ' cupid-order-editor' : ''}`}>
      <div className="christmas-editor-heading">
        <div>
          <span className="christmas-editor-eyebrow">내 {templateId === 1 ? '큐피드' : '크리스마스'} 사이트 꾸미기</span>
          <h1>{templateId === 1 && step === 'information' ? 'Our Story' : LABELS[step]}</h1>
          <p>{templateId === 1 ? CUPID_HINTS[step] : HINTS[step]}</p>
        </div>
        <span className="christmas-editor-progress">{mode === 'login' ? '1' : index + 2} / 7</span>
      </div>
      <div className="christmas-editor-frame-wrap">
        {!loaded && <div className="christmas-editor-loading" role="status">
          {loadFailed ? <div>
            <p>{templateId === 1 ? '큐피드 사이트' : '크리스마스 마켓'}를 불러오지 못했어요.</p>
            <button type="button" className="button secondary" onClick={() => { setLoadFailed(false); setFrameVersion((current) => current + 1) }}>다시 시도</button>
          </div> : <p>{templateId === 1 ? '큐피드 사이트' : '크리스마스 마켓'}를 여는 중이에요…</p>}
        </div>}
        <iframe
          key={frameVersion}
          ref={iframe}
          title={`${templateId === 1 ? '큐피드' : '크리스마스'} 사이트 제작 화면`}
          src={`${editorUrl}${editorUrl.includes('?') ? '&' : '?'}orderEditor=1`}
          onLoad={() => send('ping')}
          allow="clipboard-write"
        />
      </div>
      <div className="christmas-editor-actions">
        <button type="button" className="button secondary" onClick={previous}>
          이전 단계
        </button>
        <div className="christmas-editor-action-right">
          <button type="button" className="button secondary" onClick={() => void saveDraft()} disabled={working}>저장하기</button>
          <button id="christmas-editor-next" type="button" className="button primary" onClick={() => void next()} disabled={!complete || working || !loaded}>
            {mode === 'content' && index === CONTENT_STEPS.length - 1 ? '완성 모습 확인' : '다음 단계'}
          </button>
        </div>
      </div>
    </div>
  )
}
