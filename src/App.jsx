import { useEffect, useRef, useState } from 'react'
import './App.css'
import Icon from './components/Icon'
import Button from './components/Button'
import PositionPreview from './components/PositionPreview'
import { canProceed, mediaDuration, dateKey, minDate } from './utils/order'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { OrderContext } from './context/OrderContext'
import { PAGE_PATHS, pageFromPath } from './routes/paths'
import AppRoutes from './routes/AppRoutes'

// 화면 시연에 사용하는 초기 데이터와 날짜 유틸리티
const INITIAL = {
  template: 0,
  occasion: '연애 기념일',
  other: '',
  name: '',
  phone: '',
  date: '',
  main: '',
  sub: '',
}
const OCCASIONS = ['연애 기념일', '생일', '결혼 기념일', '기타']
const emptyFiles = () => ({ photos: Array(4).fill(null), videos: Array(4).fill(null) })

export default function App() {
  // 페이지와 입력 상태
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageFromPath(location.pathname)
  const [data, setData] = useState({ ...INITIAL })
  const [files, setFiles] = useState(emptyFiles)
  const [suggestions, setSuggestions] = useState({})
  const [sheet, setSheet] = useState(null)
  const [caption, setCaption] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [savedDraft, setSavedDraft] = useState(null)
  const [direction, setDirection] = useState('forward')
  const [generating, setGenerating] = useState({})
  const [aiErrors, setAiErrors] = useState({})
  const [touched, setTouched] = useState({})
  const isPreview = sheet?.type === 'position' || sheet?.type === 'preview'
  const swipeStart = useRef(null)
  const timers = useRef(new Set())
  const ready = canProceed(page, data, dateKey(minDate()))
  const urls = useRef(new Set()),
    dialog = useRef(null),
    opener = useRef(null)
  const step = { template: 1, info: 2, content: 3, review: 4 }[page]
  const update = (key, value) => setData((d) => ({ ...d, [key]: value }))
  const go = (p) => {
    const pages = ['main', 'start', 'template', 'info', 'content', 'review', 'done']
    setDirection(pages.indexOf(p) < pages.indexOf(page) ? 'backward' : 'forward')
    setError('')
    navigate(PAGE_PATHS[p] || PAGE_PATHS.main)
  }
  const open = (value) => {
    opener.current = document.activeElement
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
      ...dialog.current.querySelectorAll('button:not([disabled]),textarea,input'),
    ]
    items()[0]?.focus()
    const key = (e) => {
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
    const focus = (event) => {
      if (event.target.matches('input, textarea')) {
        requestAnimationFrame(() =>
          event.target.scrollIntoView({ block: 'center', behavior: 'auto' }),
        )
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
  const objectUrl = (file) => {
    const url = URL.createObjectURL(file)
    urls.current.add(url)
    return url
  }
  const updateFile = (kind, index, url, changes) => {
    setFiles((state) => ({
      ...state,
      [kind]: state[kind].map((item, i) =>
        i === index && item?.url === url ? { ...item, ...changes } : item,
      ),
    }))
  }
  const upload = (kind, index, file) => {
    if (!file) return
    const correctType = file.type.startsWith(kind === 'photos' ? 'image/' : 'video/')
    const limit = kind === 'photos' ? 20 : 100
    const url = objectUrl(file)
    const message = !correctType
      ? '파일 형식을 확인해 주세요.'
      : file.size > limit * 1024 * 1024
        ? limit + 'MB 이하 파일을 선택해 주세요.'
        : ''
    const item = {
      file,
      url,
      text: '',
      status: message ? 'error' : 'loading',
      error: message,
      progress: 0,
    }
    setFiles((state) => ({
      ...state,
      [kind]: state[kind].map((old, i) => (i === index ? item : old)),
    }))
    if (message) return
    // 서버 업로드 대신 로컬 파일 읽기 진행 상태를 표시합니다.
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable)
        updateFile(kind, index, url, { progress: Math.round((event.loaded / event.total) * 100) })
    }
    reader.onload = () => updateFile(kind, index, url, { status: 'ready', progress: 100 })
    reader.onerror = () =>
      updateFile(kind, index, url, { status: 'error', error: '파일을 읽지 못했어요.' })
    reader.readAsArrayBuffer(file)
  }
  // 새로고침 전까지 유지되는 시연용 임시 저장
  const save = () => {
    setSavedDraft({ data: { ...data }, files, page })
    setToast('임시 저장했어요. 새로고침하면 초기화됩니다.')
  }
  const load = () => {
    if (!savedDraft) {
      setToast('아직 저장한 주문서가 없어요.')
      return
    }
    setData({ ...savedDraft.data })
    setFiles(savedDraft.files)
    setSuggestions({})
    go(savedDraft.page)
    setToast('작성 중인 주문서를 불러왔어요.')
  }
  const next = (e) => {
    e.preventDefault()
    if (!ready) return
    go({ template: 'info', info: 'content', content: 'review' }[page])
  }
  const generate = (key) => {
    if (!data[key].trim() || generating[key]) return
    setGenerating((state) => ({ ...state, [key]: true }))
    setAiErrors((state) => ({ ...state, [key]: false }))
    // API 없이 결과 상태를 확인하기 위한 짧은 시연용 대기
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setGenerating((state) => ({ ...state, [key]: false }))
      try {
        showSuggestion(key)
      } catch {
        setAiErrors((state) => ({ ...state, [key]: true }))
      }
    }, 500)
    timers.current.add(timer)
  }
  const showSuggestion = (key) => {
    const options =
      key === 'main'
        ? [
            '함께라서 더 빛나는 오늘',
            '너와 함께하는 모든 순간이 선물이야',
            '우리의 가장 아름다운 순간을 기억하며',
          ]
        : [
            '지금처럼, 앞으로도 함께 걸어가자.',
            '소중한 추억을 모아 너에게 전하는 마음.',
            '평범한 날도 너와 함께라면 특별해.',
          ]
    setSuggestions((s) => ({
      ...s,
      [key]: options[(options.indexOf(s[key]) + 1) % options.length],
    }))
  }
  const editCaption = (kind, index) => {
    setCaption(files[kind][index].text)
    open({ type: 'caption', kind, index })
  }
  const back = () =>
    go({ template: 'start', info: 'template', content: 'info', review: 'content' }[page])
  const mediaSection = (kind) => (
    <section className={`content-section uploads ${kind}`}>
      <div className="section-heading">
        <h2>document 1 {kind === 'photos' ? '사진' : '영상'} 업로드</h2>
        <button
          type="button"
          className="link-button"
          onClick={() => open({ type: 'position', target: kind })}
        >
          {kind === 'photos' ? '사진' : '영상'} 위치 보러가기 <Icon name="next" small />
        </button>
      </div>
      <div className="media-grid">
        {files[kind].map((item, index) => (
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
                      upload(kind, index, event.target.files[0])
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
                      onChange={(event) => upload(kind, index, event.target.files[0])}
                    />
                  </label>
                </div>
              ) : item.status === 'loading' ? (
                <div className="upload-progress" role="status">
                  <span className="spinner" />
                  <small>{item.progress}%</small>
                  <progress max="100" value={item.progress} aria-label="파일 읽는 중" />
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
                  onClick={() =>
                    setFiles((state) => ({
                      ...state,
                      [kind]: state[kind].map((old, i) => (i === index ? null : old)),
                    }))
                  }
                >
                  <Icon name="close" small />
                </button>
              )}
            </div>
            <button
              type="button"
              className="caption-button small-button"
              disabled={item?.status !== 'ready'}
              onClick={() => editCaption(kind, index)}
            >
              {kind === 'photos' ? '캡션 작성' : '영상 제목 작성'}
            </button>
            {item?.text && <p className="media-caption">{item.text}</p>}
          </div>
        ))}
      </div>
    </section>
  )
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
        mediaSection,
        INITIAL,
        OCCASIONS,
        emptyFiles,
      }}
    >
      <div className={`app page-${page} direction-${direction}`}>
        {(page === 'main' || page === 'start') && (
          <header className="global-header">
            <div className="global-header-inner">
              <Link className="logo" to={PAGE_PATHS.main}>
                MOMENT
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
        <AppRoutes />

        {(step || page === 'done') && (
          <div className="bottom-actions">
            <div className="bottom-actions-inner">
              {page === 'review' ? (
                <button className="button primary" onClick={() => go('done')}>
                  주문 완료
                </button>
              ) : page === 'done' ? (
                <button className="button primary" onClick={() => go('main')}>
                  홈 화면으로 돌아가기
                </button>
              ) : (
                <>
                  <Button className="secondary" onClick={save}>
                    저장하기
                  </Button>
                  <Button className="primary" type="submit" form="order-form" disabled={!ready}>
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
            className={`sheet-overlay ${isPreview ? 'preview-overlay' : sheet.type === 'guide' ? 'dialog-overlay' : ''}`}
            onClick={close}
          >
            <section
              ref={dialog}
              className={
                isPreview
                  ? 'preview-modal'
                  : sheet.type === 'guide'
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
                      maxLength={sheet.kind === 'photos' ? 40 : 15}
                      placeholder={
                        sheet.kind === 'photos'
                          ? '사진에 어울리는 캡션을 작성해 주세요'
                          : '영상 제목을 작성해 주세요'
                      }
                    />
                    <span
                      className={
                        caption.length >= (sheet.kind === 'photos' ? 40 : 15)
                          ? 'counter-limit'
                          : undefined
                      }
                    >
                      {caption.length}/{sheet.kind === 'photos' ? 40 : 15}
                    </span>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => {
                      setFiles((f) => ({
                        ...f,
                        [sheet.kind]: f[sheet.kind].map((x, i) =>
                          i === sheet.index ? { ...x, text: caption } : x,
                        ),
                      }))
                      close()
                    }}
                  >
                    완료
                  </button>
                </>
              ) : sheet.type === 'guide' ? (
                <>
                  <h2 id="sheet-heading">주문서 작성 방법</h2>
                  <ol className="guide-list">
                    <li>템플릿과 기념일 종류를 선택해 주세요.</li>
                    <li>주문자 정보와 희망 수령일을 입력해 주세요.</li>
                    <li>문구와 사진, 영상을 채워주세요.</li>
                    <li>마지막으로 주문 내용을 확인해 주세요.</li>
                  </ol>
                  <p className="sheet-note">...</p>
                  <button className="button primary" onClick={close}>
                    확인
                  </button>
                </>
              ) : (
                <PositionPreview target={sheet.target} onClose={close} />
              )}
            </section>
          </div>
        )}
      </div>
    </OrderContext.Provider>
  )
}
