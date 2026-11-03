import { useEffect, useRef, useState } from 'react'
import { useOrder } from '../../context/OrderContext'
import * as api from '../../services/API'

const musicLabels = {
  title: ['음악 제목', '음악 제목을 입력해 주세요'],
  artist: ['가수', '가수 이름을 입력해 주세요'],
  youtubeUrl: ['유튜브 링크', 'https://youtube.com/...'],
} as const

export default function PinkSiteContentForm() {
  const { config, data, setData, update, mediaSection, open, setToast, session, reportError } =
    useOrder()
  const visibleMusics = data.musics.length
    ? data.musics
    : [{ title: '', artist: '', youtubeUrl: '' }]
  const musicListRef = useRef<HTMLDivElement>(null)
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0)
  const [letterGenerating, setLetterGenerating] = useState(false)

  useEffect(() => {
    setCurrentMusicIndex((current) => Math.min(current, visibleMusics.length - 1))
  }, [visibleMusics.length])

  if (!config) return <p role="status">주문 설정을 불러오는 중이에요.</p>
  const letterMin = config.limits.letterInputMinLength ?? 10
  const letterMax = config.limits.letterMaxLength ?? 2000

  /** 입력 필드의 편지를 AI로 다듬되, 사용하기 전까지 최종 주문 데이터에는 반영하지 않습니다. */
  const generateLetter = async () => {
    const raw = data.letterInput.trim()
    if (letterGenerating || !session) return
    if (raw.length < letterMin) {
      setToast(`편지에 담을 말을 ${letterMin}자 이상 적어 주세요.`)
      return
    }
    setLetterGenerating(true)
    try {
      await api.updateDraft(session.draftId, {
        specialDay: data.specialDay || null,
        specialPlace: data.specialPlace || null,
        specialOccasion: data.specialOccasion || null,
      }, session.draftToken)
      const result = await api.generateAiLetter(session.draftId, raw, session.draftToken)
      setData((current) => ({
        ...current,
        letterInput: result.letterInput,
        letterAi: result.letterAi,
        letterChoice: result.letterChoice,
      }))
      setToast(`AI 문장을 생성했어요. 남은 생성 횟수 ${result.remainingCount}회`)
    } catch (cause) {
      reportError(cause)
    } finally {
      setLetterGenerating(false)
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
          <h2>INFORMATION 작성</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'story' })}
          >
            INFORMATION 위치 및 예시 보러가기 ›
          </button>
        </div>
        <p className="description information-description">
          선물 받는 분과의 특별한 날, 특별한 장소, 어떤 기념일인지 간단하게 작성해주세요.
        </p>
        <div className="information-fields">
          <input
            className="text-input"
            type="date"
            value={data.specialDay}
            placeholder="특별한 날을 작성해주세요."
            aria-label="특별한 날"
            onChange={(event) => update('specialDay', event.target.value)}
          />
          <input
            className="text-input"
            value={data.specialPlace}
            maxLength={100}
            placeholder="특별한 장소를 작성해주세요."
            aria-label="특별한 장소"
            onChange={(event) => update('specialPlace', event.target.value)}
          />
          <input
            className="text-input"
            value={data.specialOccasion}
            maxLength={50}
            placeholder="어떤 일을 기념하는지 작성해주세요."
            aria-label="어떤 기념일인지"
            onChange={(event) => update('specialOccasion', event.target.value)}
          />
        </div>
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
        <div className="letter-compose">
          <textarea
            className="text-input"
            rows={7}
            maxLength={letterMax}
            value={data.letterInput}
            disabled={letterGenerating}
            aria-label="편지"
            placeholder="웹사이트를 선물받는 분께 보여줄 편지를 작성해주세요."
            onChange={(event) => {
              setData((current) => ({
                ...current,
                letterInput: event.target.value,
                letterChoice: 'ORIGINAL',
              }))
            }}
          />
        </div>
        <div className="letter-actions">
          <button
            type="button"
            className="small-button letter-ai-button"
            disabled={letterGenerating || data.letterInput.trim().length < letterMin}
            onClick={() => void generateLetter()}
          >
            {letterGenerating ? '생성 중…' : 'AI 문장 생성'}
          </button>
        </div>
        {data.letterAi && (
          <div className="ai-suggestion" role="status" aria-live="polite">
            <span className="ai-suggestion-icon" aria-hidden="true">
              ✦
            </span>
            <p>{data.letterAi}</p>
            <small>{data.letterChoice === 'AI' ? 'AI 문장 선택됨' : data.letterChoice === 'ORIGINAL' ? '원문 선택됨' : '사용할 편지를 선택해 주세요.'}</small>
            <button type="button" onClick={() => update('letterChoice', 'ORIGINAL')}>
              원문 사용
            </button>
            <button
              type="button"
              onClick={() => update('letterChoice', 'AI')}
            >
              AI 문장 사용
            </button>
          </div>
        )}
      </section>

      <section className="content-section url-section">
        <div className="section-heading">
          <h2>URL 작성</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'url' })}
          >
            폴더 위치 및 예시 보러가기 ›
          </button>
        </div>
        <p className="description">
          웹사이트 하단의 INTERNET 아이콘을 누르면 연결될 사이트 링크를 넣어주세요.
        </p>
        <input
          className="text-input url-input"
          type="url"
          inputMode="url"
          autoComplete="url"
          maxLength={500}
          value={data.linkUrl}
          placeholder="https://youtube.com/..."
          aria-label="연결할 사이트 URL"
          onChange={(event) => update('linkUrl', event.target.value)}
        />
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
