import { useOrder } from '../context/OrderContext'

export default function ContentPage() {
  const { config, data, update, generate, generating, aiErrors, mediaSection, open } = useOrder()
  if (!config) return <p role="status">주문 설정을 불러오는 중이에요.</p>
  const limits = config.limits
  return (
    <>
      <div className="content-intro">
        <h1>콘텐츠 입력</h1>
        <p className="description">추억 이야기와 음악, 편지로 기념 사이트를 채워주세요.</p>
      </div>
      <section className="content-section">
        <h2>
          <label htmlFor="site-password">
            완성 사이트 비밀번호 <span className="required-mark">*</span>
          </label>
        </h2>
        <p className="description">
          {data.sitePasswordSet
            ? '비밀번호가 설정되어 있어요. 변경할 때만 입력해 주세요.'
            : '사이트를 열 때 사용할 비밀번호를 정해 주세요.'}{' '}
          공백 없이 4~20자입니다.
        </p>
        <input
          id="site-password"
          className="text-input"
          type="password"
          autoComplete="new-password"
          minLength={4}
          maxLength={20}
          value={data.sitePassword}
          onChange={(e) => update('sitePassword', e.target.value)}
          aria-invalid={Boolean(data.sitePassword && !/^[^\s]{4,20}$/.test(data.sitePassword))}
        />
        {data.sitePassword && !/^[^\s]{4,20}$/.test(data.sitePassword) && (
          <p className="field-error">공백 없이 4~20자로 입력해 주세요.</p>
        )}
      </section>
      <section className="content-section">
        <h2>
          <label htmlFor="memory-input">
            추억 이야기 <span className="required-mark">*</span>
          </label>
        </h2>
        <p className="description">
          이름, 함께한 기간, 기억에 남는 에피소드를 적어 주세요. AI가 제목과 이야기를 만들고
          저장해요.
        </p>
        <textarea
          id="memory-input"
          className="text-input story-input"
          rows={7}
          value={data.memoryInput}
          maxLength={limits.memoryInputMaxLength}
          disabled={generating.main}
          onChange={(e) => update('memoryInput', e.target.value)}
        />
        <p className="description">
          {data.memoryInput.length} / {limits.memoryInputMaxLength}자 · 최소{' '}
          {limits.memoryInputMinLength}자
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={generating.main || data.memoryInput.trim().length < limits.memoryInputMinLength}
          onClick={() => generate('main')}
        >
          {generating.main
            ? '이야기를 만드는 중이에요…'
            : data.main
              ? '추억 이야기 다시 만들기'
              : 'AI 추억 이야기 만들기'}
        </button>
        {aiErrors.main && (
          <p role="alert">이야기를 만들지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.</p>
        )}
        {data.main && (
          <div className="story-result">
            <h3>{data.main}</h3>
            <p>{data.sub}</p>
            <p className="description">
              생성된 이야기는 저장되어 있어요. 원문을 수정했다면 다시 만들어 주세요.
            </p>
          </div>
        )}
        <button
          type="button"
          className="link-button"
          onClick={() => open({ type: 'position', target: 'story' })}
        >
          사이트에서의 위치 보기
        </button>
      </section>
      <section className="content-section">
        <h2>
          추천 음악 <span className="required-mark">*</span>
        </h2>
        <p className="description">음악을 1개 이상 추가해 주세요. 입력한 순서대로 표시됩니다.</p>
        {data.musics.map((music, index) => (
          <fieldset className="content-entry" key={index}>
            <legend>음악 {index + 1}</legend>
            {(['title', 'artist', 'album', 'youtubeUrl'] as const).map((key) => (
              <label key={key}>
                {
                  {
                    title: '곡 이름 *',
                    artist: '가수 *',
                    album: '앨범 이름 *',
                    youtubeUrl: '유튜브 링크 (선택)',
                  }[key]
                }
                <input
                  className="text-input"
                  value={music[key] ?? ''}
                  maxLength={key === 'youtubeUrl' ? undefined : 100}
                  onChange={(e) =>
                    update(
                      'musics',
                      data.musics.map((item, i) =>
                        i === index ? { ...item, [key]: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="link-button"
              onClick={() =>
                update(
                  'musics',
                  data.musics.filter((_, i) => i !== index),
                )
              }
            >
              음악 삭제
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            update('musics', [...data.musics, { title: '', artist: '', album: '', youtubeUrl: '' }])
          }
        >
          음악 추가
        </button>
      </section>
      <section className="content-section">
        <h2>편지 (선택)</h2>
        {data.letters.map((letter, index) => (
          <fieldset className="content-entry" key={index}>
            <legend>편지 {index + 1}</legend>
            <textarea
              aria-label={`편지 ${index + 1} 내용`}
              className="text-input story-input"
              rows={6}
              maxLength={limits.letterMaxLength}
              value={letter.content}
              onChange={(e) =>
                update(
                  'letters',
                  data.letters.map((item, i) => (i === index ? { content: e.target.value } : item)),
                )
              }
            />
            <p className="description">
              {letter.content.length} / {limits.letterMaxLength}자
            </p>
            <button
              type="button"
              className="link-button"
              onClick={() =>
                update(
                  'letters',
                  data.letters.filter((_, i) => i !== index),
                )
              }
            >
              편지 삭제
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => update('letters', [...data.letters, { content: '' }])}
        >
          편지 추가
        </button>
      </section>
      {mediaSection('photos')}
      {mediaSection('videos')}
    </>
  )
}
