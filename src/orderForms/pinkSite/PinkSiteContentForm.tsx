import { useRef, useState } from 'react'
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
  const [editingAi, setEditingAi] = useState(false)
  const [aiDraft, setAiDraft] = useState('')

  if (currentMusicIndex >= visibleMusics.length) {
    setCurrentMusicIndex(visibleMusics.length - 1)
  }

  if (!config) return <p role="status">주문 설정을 불러오는 중이에요.</p>
  const letterMin = config.limits.letterInputMinLength ?? 10
  const letterMax = config.limits.letterMaxLength ?? 2000

  /** 입력 필드의 편지를 AI로 다듬되, 사용하기 전까지 최종 주문 데이터에는 반영하지 않습니다. */
  const generateLetter = async () => {
    const raw = (data.letterChoice === 'AI' ? data.letterAi : data.letterInput).trim()
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
      setEditingAi(false)
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
          <h2>INFORMATION 작성 <span className="required-mark" aria-label="필수">*</span></h2>
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
            required
            onChange={(event) => update('specialDay', event.target.value)}
          />
          <input
            className="text-input"
            value={data.specialPlace}
            maxLength={100}
            placeholder="특별한 장소를 작성해주세요."
            aria-label="특별한 장소"
            required
            onChange={(event) => update('specialPlace', event.target.value)}
          />
          <input
            className="text-input"
            value={data.specialOccasion}
            maxLength={50}
            placeholder="어떤 일을 기념하는지 작성해주세요."
            aria-label="어떤 기념일인지"
            required
            onChange={(event) => update('specialOccasion', event.target.value)}
          />
        </div>
      </section>

      <section className="content-section letter-section">
        <div className="section-heading">
          <h2>LETTER 작성 <span className="required-mark" aria-label="필수">*</span></h2>
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
            value={data.letterChoice === 'AI' ? data.letterAi : data.letterInput}
            disabled={letterGenerating}
            aria-label="편지"
            required
            placeholder="웹사이트를 선물받는 분께 보여줄 편지를 작성해주세요."
            onChange={(event) =>
              update(data.letterChoice === 'AI' ? 'letterAi' : 'letterInput', event.target.value)
            }
          />
        </div>
        <div className="letter-actions">
          <p id="letter-ai-minimum" className="letter-choice-status letter-ai-minimum">
            AI 생성은 최소 {letterMin}자부터 가능해요.
          </p>
          <button
            type="button"
            className={`small-button letter-choice-button${data.letterChoice === 'ORIGINAL' ? ' is-selected' : ''}`}
            aria-pressed={data.letterChoice === 'ORIGINAL'}
            disabled={letterGenerating || !data.letterInput.trim()}
            onClick={() => {
              setEditingAi(false)
              update('letterChoice', 'ORIGINAL')
            }}
          >
            {data.letterChoice === 'ORIGINAL' ? '✓ 원문 사용 중' : '원문 사용'}
          </button>
          <button
            type="button"
            className="small-button letter-choice-button"
            disabled={letterGenerating || data.letterInput.trim().length < letterMin}
            aria-describedby="letter-ai-minimum"
            onClick={() => void generateLetter()}
          >
            {letterGenerating ? '생성 중…' : data.letterAi ? 'AI 문장 다시 생성' : 'AI 문장 생성'}
          </button>
        </div>
        {data.letterAi && (
          <div
            className={`ai-suggestion${data.letterChoice === 'AI' ? ' is-selected' : ''}`}
            aria-live="polite"
          >
            <div className="ai-suggestion-head">
              <span className="ai-suggestion-icon" aria-hidden="true">
                ✦
              </span>
              <strong>AI 문장</strong>
              {!editingAi && <small>눌러서 직접 고칠 수 있어요</small>}
            </div>
            {editingAi ? (
              <>
                <textarea
                  className="text-input ai-suggestion-editor"
                  rows={7}
                  maxLength={letterMax}
                  value={aiDraft}
                  aria-label="AI 문장 수정"
                  autoFocus
                  onChange={(event) => setAiDraft(event.target.value)}
                />
                <div className="ai-suggestion-actions">
                  <button type="button" onClick={() => setEditingAi(false)}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!aiDraft.trim()}
                    onClick={() => {
                      update('letterAi', aiDraft.trim())
                      setEditingAi(false)
                    }}
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ai-suggestion-text"
                  aria-label="AI 문장 수정하기"
                  disabled={letterGenerating}
                  onClick={() => {
                    setAiDraft(data.letterAi)
                    setEditingAi(true)
                  }}
                >
                  {data.letterAi}
                </button>
                <div className="ai-suggestion-actions">
                  <button
                    type="button"
                    className={data.letterChoice === 'AI' ? 'primary' : undefined}
                    aria-pressed={data.letterChoice === 'AI'}
                    disabled={letterGenerating}
                    onClick={() => update('letterChoice', 'AI')}
                  >
                    {data.letterChoice === 'AI' ? '✓ AI 문장 사용 중' : 'AI 문장 사용'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <p className="letter-choice-status" role="status">
          {data.letterChoice === 'AI'
            ? 'AI 문장을 편지로 사용해요.'
            : data.letterChoice === 'ORIGINAL'
              ? '작성한 원문을 편지로 사용해요.'
              : '원문 사용 또는 AI 문장 생성 중 하나를 선택해 주세요.'}
        </p>
      </section>

      <section className="content-section url-section">
        <div className="section-heading">
          <h2>인터넷 아이콘에 연결할 링크 <span className="required-mark" aria-label="필수">*</span></h2>
          <button
            type="button"
            className="link-button"
            onClick={() => open({ type: 'position', target: 'url' })}
          >
            폴더 위치 및 예시 보러가기 ›
          </button>
        </div>
        <p className="description">
          완성된 웹사이트에서 인터넷 아이콘을 누르면 열릴 주소를 입력해 주세요.
        </p>
        <input
          className="text-input url-input"
          type="url"
          inputMode="url"
          autoComplete="url"
          maxLength={500}
          value={data.linkUrl}
          placeholder="예: https://www.youtube.com/watch?v=…"
          aria-label="인터넷 아이콘에 연결할 링크"
          required
          onChange={(event) => update('linkUrl', event.target.value)}
        />
        <p className="description">http:// 또는 https://로 시작하는 주소를 입력해 주세요.</p>
      </section>

      <section className="content-section music-section">
        <div className="section-heading">
          <h2>
            MUSIC 작성 <span className="required-mark">*</span> (최소 1곡)
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
                      required={key !== 'youtubeUrl'}
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
