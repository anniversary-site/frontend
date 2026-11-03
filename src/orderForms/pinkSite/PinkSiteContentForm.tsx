import { useEffect, useRef, useState } from 'react'
import { useOrder } from '../../context/OrderContext'
import * as api from '../../services/API'
import type { Letter } from '../../services/API'

const musicLabels = {
  title: ['음악 제목', '음악 제목을 입력해 주세요'],
  artist: ['가수', '가수 이름을 입력해 주세요'],
  youtubeUrl: ['유튜브 링크', 'https://youtube.com/...'],
} as const

/** 한 줄 칸에 보이는 글: AI로 다듬었으면 원문(input), 아니면 편지 그대로(content). */
const letterDraft = (letter: Letter) => letter.input ?? letter.content

export default function PinkSiteContentForm() {
  const {
    config,
    data,
    setData,
    update,
    generate,
    generating,
    aiErrors,
    mediaSection,
    open,
    setToast,
    session,
    reportError,
  } = useOrder()
  const visibleLetters = data.letters
  const visibleMusics = data.musics.length
    ? data.musics
    : [{ title: '', artist: '', youtubeUrl: '' }]
  const musicListRef = useRef<HTMLDivElement>(null)
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0)
  const [letterGenerating, setLetterGenerating] = useState<number | null>(null)

  useEffect(() => {
    setCurrentMusicIndex((current) => Math.min(current, visibleMusics.length - 1))
  }, [visibleMusics.length])

  if (!config) return <p role="status">주문 설정을 불러오는 중이에요.</p>
  const letterMin = config.limits.letterInputMinLength ?? 10

  const setLetter = (index: number, next: Letter) =>
    setData((current) => ({
      ...current,
      letters: current.letters.map((item, itemIndex) => (itemIndex === index ? next : item)),
    }))

  /** 한 줄 칸에 적은 말을 AI가 편지로 다듬습니다. 원문은 input에, 다듬은 편지는 content에 둡니다. */
  const generateLetter = async (index: number) => {
    const raw = letterDraft(visibleLetters[index]).trim()
    if (letterGenerating !== null || !session) return
    if (raw.length < letterMin) {
      setToast(`편지에 담을 말을 ${letterMin}자 이상 적어 주세요.`)
      return
    }
    setLetterGenerating(index)
    try {
      const result = await api.generateAiLetter(session.draftId, raw, session.draftToken)
      setLetter(index, { input: result.input, content: result.content })
      setToast(`편지를 다듬었어요. 남은 생성 횟수 ${result.remainingCount}회`)
    } catch (cause) {
      reportError(cause)
    } finally {
      setLetterGenerating(null)
    }
  }

  const moveMusicCard = (nextIndex: number) => {
    const index = Math.max(0, Math.min(nextIndex, visibleMusics.length - 1))
    const list = musicListRef.current
    const card = musicListRef.current?.children[index] as HTMLElement | undefined
    if (card && list) {
      const left = card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2
      list.scrollTo({ left, behavior: 'smooth' })
    }
    setCurrentMusicIndex(index)
  }

  const syncMusicIndex = () => {
    const list = musicListRef.current
    if (!list) return
    const cards = Array.from(list.children) as HTMLElement[]
    const listCenter = list.scrollLeft + list.clientWidth / 2
    const closestIndex = cards.reduce((closest, card, index) => {
      const currentDistance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - listCenter)
      const closestDistance = Math.abs(
        cards[closest].offsetLeft + cards[closest].offsetWidth / 2 - listCenter,
      )
      return currentDistance < closestDistance ? index : closest
    }, 0)
    setCurrentMusicIndex(closestIndex)
  }

  return (
    <div className="pink-order-form">
      <div className="content-intro">
        <h1>콘텐츠 입력</h1>
        <p className="description">페이지에 들어갈 문구와 미디어를 채워주세요.</p>
      </div>

      <section className="content-section order-copy-section">
        <div className="section-heading">
          <h2>
            OUR STORY 작성 <span className="required-mark">*</span>
          </h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'story' })}
          >
            폴더 위치 및 예시 보러가기 ›
          </button>
        </div>
        <div className="story-compose">
          <textarea
            className="text-input"
            rows={4}
            value={data.memoryInput}
            maxLength={config.limits.memoryInputMaxLength}
            disabled={generating.main}
            placeholder="만난 날짜, 함께 보낸 기간 등 우리의 이야기를 작성해 주세요."
            aria-label="추억 이야기 원문"
            onChange={(event) => update('memoryInput', event.target.value)}
          />
        </div>
        <div className="field-meta">
          <span>최소 {config.limits.memoryInputMinLength}자</span>
          <div className="story-actions">
            <span>
              {data.memoryInput.length}/{config.limits.memoryInputMaxLength}
            </span>
            <button
              type="button"
              className="small-button ai-compose-button"
              disabled={
                generating.main ||
                data.memoryInput.trim().length < config.limits.memoryInputMinLength
              }
              onClick={() => generate('main')}
            >
              {generating.main ? '생성 중…' : data.main ? 'AI 다시 생성' : 'AI 문장 생성'}
            </button>
          </div>
        </div>
        {aiErrors.main && (
          <p className="field-error" role="alert">
            이야기를 만들지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.
          </p>
        )}
        {data.main && (
          <div className="story-result">
            <h3>{data.main}</h3>
            <p>{data.sub}</p>
          </div>
        )}
      </section>

      <section className="content-section letter-section">
        <div className="section-heading">
          <h2>LETTER 작성</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'letters' })}
          >
            폴더 위치 및 예시 보러가기 ›
          </button>
        </div>
        <div className="letter-list">
          {visibleLetters.map((letter, index) => {
            const busy = letterGenerating === index
            const polished = letter.input != null
            return (
              <div className="letter-item" key={index}>
                <div className="letter-row">
                  <input
                    className="text-input"
                    maxLength={config.limits.letterMaxLength}
                    value={letterDraft(letter)}
                    disabled={busy}
                    aria-label={`편지 ${index + 1}`}
                    placeholder="전하고 싶은 말을 적어 주세요. AI가 편지로 다듬어 드려요."
                    onChange={(event) =>
                      setLetter(
                        index,
                        polished
                          ? { ...letter, input: event.target.value }
                          : { input: null, content: event.target.value },
                      )
                    }
                  />
                  <button
                    type="button"
                    className="small-button letter-ai-button"
                    disabled={letterGenerating !== null}
                    onClick={() => void generateLetter(index)}
                  >
                    {busy ? '생성 중…' : polished ? 'AI 다시 생성' : 'AI 문장 생성'}
                  </button>
                  <button
                    type="button"
                    className="letter-delete-button"
                    aria-label={`편지 ${index + 1} 삭제`}
                    disabled={letterGenerating !== null}
                    onClick={() =>
                      update(
                        'letters',
                        visibleLetters.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
                {polished && (
                  <div className="letter-ai-result">
                    <textarea
                      className="text-input"
                      rows={6}
                      maxLength={config.limits.letterMaxLength}
                      value={letter.content}
                      disabled={busy}
                      aria-label={`AI가 다듬은 편지 ${index + 1}`}
                      onChange={(event) =>
                        setLetter(index, { ...letter, content: event.target.value })
                      }
                    />
                    <div className="field-meta">
                      <span>
                        AI가 다듬은 편지예요. 사이트에는 이 글이 들어가요. 고쳐 써도 돼요.
                      </span>
                      <button
                        type="button"
                        className="link-button"
                        disabled={busy}
                        onClick={() =>
                          setLetter(index, { input: null, content: letter.input ?? '' })
                        }
                      >
                        원문 그대로 쓰기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          className="button form-add-button"
          onClick={() => update('letters', [...visibleLetters, { input: null, content: '' }])}
        >
          ＋ 편지 개수 추가하기
        </button>
      </section>

      <section className="content-section music-section">
        <div className="section-heading">
          <h2>
            MUSIC 작성 <span className="required-mark">*</span>
          </h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'music' })}
          >
            폴더 위치 및 예시 보러가기 ›
          </button>
        </div>
        <div className="music-description-row">
          <p className="description">사이트에서 재생할 음악 정보를 입력해 주세요.</p>
          <span className="music-page-indicator" aria-live="polite">
            {currentMusicIndex + 1}/{visibleMusics.length}
          </span>
        </div>
        <div className={`music-carousel${visibleMusics.length > 1 ? ' has-multiple' : ''}`}>
          <button
            type="button"
            className="music-carousel-button previous"
            aria-label="이전 음악"
            disabled={currentMusicIndex === 0}
            onClick={() => moveMusicCard(currentMusicIndex - 1)}
          >
            ‹
          </button>
          <div className="music-list" ref={musicListRef} onScroll={syncMusicIndex}>
            {visibleMusics.map((music, index) => (
              <div
                className={`music-card${index === currentMusicIndex ? ' is-active' : ''}`}
                key={index}
              >
                <div className="music-card-header">
                  <strong>음악 {index + 1}</strong>
                  {visibleMusics.length > 1 && (
                    <button
                      type="button"
                      className="music-delete-button"
                      onClick={() =>
                        update(
                          'musics',
                          visibleMusics.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      음악 삭제
                    </button>
                  )}
                </div>
                {(Object.keys(musicLabels) as (keyof typeof musicLabels)[]).map((key) => (
                  <label className="music-field" key={key}>
                    <span>
                      {musicLabels[key][0]}
                      {key !== 'youtubeUrl' && <span className="required-mark"> *</span>}
                    </span>
                    <input
                      className="text-input"
                      type={key === 'youtubeUrl' ? 'url' : 'text'}
                      value={music[key] ?? ''}
                      placeholder={musicLabels[key][1]}
                      maxLength={key === 'youtubeUrl' ? undefined : 100}
                      onChange={(event) =>
                        update(
                          'musics',
                          visibleMusics.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, [key]: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="music-carousel-button next"
            aria-label="다음 음악"
            disabled={currentMusicIndex === visibleMusics.length - 1}
            onClick={() => moveMusicCard(currentMusicIndex + 1)}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className="button form-add-button"
          onClick={() => {
            update('musics', [...visibleMusics, { title: '', artist: '', youtubeUrl: '' }])
            requestAnimationFrame(() => moveMusicCard(visibleMusics.length))
          }}
        >
          ＋ 음악 추가하기
        </button>
      </section>

      {mediaSection('photos')}
      {mediaSection('videos')}
    </div>
  )
}
