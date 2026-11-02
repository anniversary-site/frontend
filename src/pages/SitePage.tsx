import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../services/API'
import type { SiteContent, SiteSession } from '../services/API'
import './SitePage.css'

export default function SitePage() {
  const { siteKey = '' } = useParams()
  return <SiteView key={siteKey} siteKey={siteKey} />
}

function SiteView({ siteKey }: { siteKey: string }) {
  const storageKey = `urluv-site-${siteKey}`
  const [session, setSession] = useState<SiteSession | null>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      return saved?.siteAccessToken && Date.parse(saved.expiresAt) > Date.now() ? saved : null
    } catch {
      return null
    }
  })
  const [content, setContent] = useState<SiteContent | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!session) return
    let active = true
    setBusy(true)
    api
      .getSite(siteKey, session.siteAccessToken)
      .then((result) => {
        if (active) {
          setContent(result)
          setError('')
        }
      })
      .catch((cause) => {
        if (!active) return
        setContent(null)
        setError(cause.message)
        if (cause instanceof api.ApiError && [401, 404, 410].includes(cause.status)) {
          setSession(null)
          try {
            sessionStorage.removeItem(storageKey)
          } catch {}
        }
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [session, siteKey, storageKey])
  return (
    <main className="delivered-site">
      {error && <p role="alert">{error}</p>}
      {!content ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy) return
            setBusy(true)
            setError('')
            try {
              const result = await api.unlockSite(siteKey, password)
              try {
                sessionStorage.setItem(storageKey, JSON.stringify(result))
              } catch {}
              setSession(result)
              setPassword('')
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : '사이트를 열지 못했어요.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <h1>우리의 추억 열기</h1>
          <label htmlFor="site-unlock">전달받은 비밀번호를 입력해 주세요.</label>
          <input
            id="site-unlock"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button disabled={busy}>{busy ? '확인 중…' : '사이트 열기'}</button>
        </form>
      ) : (
        <>
          <h1>{content.memoryTitle}</h1>
          <p className="site-story">{content.memoryStory}</p>
          {content.documents.map((document) => (
            <section key={document.documentNo} aria-label={`추억 ${document.documentNo}`}>
              {document.photos.map((photo) => (
                <figure key={photo.mediaId}>
                  <img src={photo.url} alt={photo.caption || '추억 사진'} />
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
              {document.videos.map((video) => (
                <figure key={video.mediaId}>
                  <video controls src={video.url} poster={video.thumbnailUrl || undefined} />
                  <figcaption>{video.title}</figcaption>
                </figure>
              ))}
            </section>
          ))}
          {content.musics.length > 0 && (
            <section>
              <h2>함께 듣는 음악</h2>
              {content.musics.map((music, index) => (
                <p key={index}>
                  {music.title} · {music.artist} · {music.album}
                  {music.youtubeUrl &&
                    /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(
                      music.youtubeUrl,
                    ) && (
                      <>
                        {' '}
                        <a href={music.youtubeUrl} target="_blank" rel="noreferrer">
                          음악 듣기
                        </a>
                      </>
                    )}
                </p>
              ))}
            </section>
          )}
          {content.letters.map((letter, index) => (
            <section className="site-story" key={index}>
              <h2>편지 {index + 1}</h2>
              <p>{letter.content}</p>
            </section>
          ))}
        </>
      )}
    </main>
  )
}
