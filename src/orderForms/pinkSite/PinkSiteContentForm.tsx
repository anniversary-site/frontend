import { useOrder } from '../../context/OrderContext'

const musicLabels = {
  title: ['음악 제목', '음악 제목을 입력해 주세요'],
  artist: ['가수', '가수 이름을 입력해 주세요'],
  album: ['앨범', '앨범 이름을 입력해 주세요'],
  youtubeUrl: ['유튜브 링크', 'https://youtube.com/...'],
} as const

export default function PinkSiteContentForm() {
  const { config, data, update, generate, generating, aiErrors, mediaSection, open } = useOrder()
  if (!config) return <p role="status">주문 설정을 불러오는 중이에요.</p>

  return (
    <div className="pink-order-form">
      <div className="content-intro">
        <h1>콘텐츠 입력</h1>
        <p className="description">페이지에 들어갈 문구와 미디어를 채워주세요.</p>
      </div>

      <section className="content-section order-copy-section">
        <div className="section-heading">
          <h2>OUR STORY 작성</h2>
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
          <button
            type="button"
            className="small-button ai-compose-button"
            disabled={
              generating.main || data.memoryInput.trim().length < config.limits.memoryInputMinLength
            }
            onClick={() => generate('main')}
          >
            {generating.main ? '생성 중…' : data.main ? 'AI 다시 생성' : 'AI 문장 생성'}
          </button>
        </div>
        <div className="field-meta">
          <span>최소 {config.limits.memoryInputMinLength}자</span>
          <span>
            {data.memoryInput.length}/{config.limits.memoryInputMaxLength}
          </span>
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
        <p className="description">기억에 남는 마음을 편지로 남겨주세요. 편지는 선택 사항이에요.</p>
        <div className="letter-list">
          {data.letters.map((letter, index) => (
            <div className="letter-row" key={index}>
              <textarea
                className="text-input"
                rows={2}
                maxLength={config.limits.letterMaxLength}
                value={letter.content}
                aria-label={`편지 ${index + 1}`}
                placeholder="주고받았던 편지 내용 중 기억에 남는 내용을 작성해 주세요."
                onChange={(event) =>
                  update(
                    'letters',
                    data.letters.map((item, itemIndex) =>
                      itemIndex === index ? { content: event.target.value } : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="remove-entry"
                aria-label={`편지 ${index + 1} 삭제`}
                onClick={() =>
                  update(
                    'letters',
                    data.letters.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button form-add-button"
          onClick={() => update('letters', [...data.letters, { content: '' }])}
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
        <p className="description">사이트에서 재생할 음악 정보를 입력해 주세요.</p>
        <div className="music-list">
          {data.musics.map((music, index) => (
            <fieldset className="music-card" key={index}>
              <legend>음악 {index + 1}</legend>
              <button
                type="button"
                className="remove-entry"
                aria-label={`음악 ${index + 1} 삭제`}
                onClick={() =>
                  update(
                    'musics',
                    data.musics.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
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
                        data.musics.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, [key]: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button form-add-button"
          onClick={() =>
            update('musics', [...data.musics, { title: '', artist: '', album: '', youtubeUrl: '' }])
          }
        >
          ＋ 음악 추가하기
        </button>
      </section>

      {mediaSection('photos')}
      {mediaSection('videos')}
    </div>
  )
}
