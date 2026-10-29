import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function ContentPage() {
  const {
    data,
    update,
    open,
    generate,
    generating,
    aiErrors,
    suggestions,
    setSuggestions,
    mediaSection,
  } = useOrder()
  return (
    <>
      <div className="content-intro">
        <h1>콘텐츠 입력</h1>
        <p className="description">페이지에 들어갈 문구와 미디어를 채워주세요.</p>
      </div>
      {(
        [
          ['main', '메인'],
          ['sub', '서브'],
        ] as const
      ).map(([key, title]) => (
        <section className="content-section ai-field" key={key}>
          <div className="section-heading">
            <h2>
              <label htmlFor={`${key}-phrase`}>
                {title} 문구 작성
                {key === 'main' && (
                  <span className="required-mark" aria-label="필수">
                    {' '}
                    *
                  </span>
                )}
              </label>
            </h2>
            <button
              type="button"
              className="link-button"
              onClick={() => open({ type: 'position', target: key })}
            >
              문구 위치 보러가기 <Icon name="next" small />
            </button>
          </div>
          <div className="ai-input">
            <input
              className="text-input"
              id={`${key}-phrase`}
              placeholder="문구를 입력해 주세요"
              value={data[key]}
              onChange={(e) => update(key, e.target.value)}
              maxLength={key === 'main' ? 100 : 200}
            />
            <button
              className="ai-button"
              type="button"
              disabled={!data[key].trim() || generating[key]}
              aria-busy={generating[key] || undefined}
              onClick={() => generate(key)}
            >
              {generating[key] ? <span className="spinner" aria-label="생성 중" /> : 'AI 문장 생성'}
            </button>
          </div>
          {generating[key] && (
            <div className="ai-skeleton" role="status" aria-label="문구 생성 중">
              <span />
              <span />
            </div>
          )}
          {aiErrors[key] && (
            <div className="ai-error" role="alert">
              <p>문구를 만들지 못했어요. 다시 시도해 주세요.</p>
              <button type="button" className="small-button" onClick={() => generate(key)}>
                다시 생성하기
              </button>
            </div>
          )}
          {!generating[key] && !aiErrors[key] && suggestions[key] && (
            <div className="suggestion">
              <span>✦</span>
              <p>{suggestions[key]}</p>
              <button
                type="button"
                onClick={() => {
                  const suggestion = suggestions[key]
                  if (!suggestion) return
                  update(key, suggestion)
                  setSuggestions((s) => {
                    const copy = { ...s }
                    delete copy[key]
                    return copy
                  })
                }}
              >
                사용하기
              </button>
            </div>
          )}
        </section>
      ))}
      {mediaSection('photos')}
      {mediaSection('videos')}
    </>
  )
}
