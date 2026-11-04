import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../services/API'
import type { SiteContent, SiteLock, SiteSession } from '../services/API'
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
  const [lock, setLock] = useState<SiteLock | null>(null)
  useEffect(() => {
    if (session) return
    let active = true
    api
      .getSiteLock(siteKey)
      .then((result) => {
        if (active) setLock(result)
      })
      .catch((cause) => {
        if (active) setError(cause.message)
      })
    return () => {
      active = false
    }
  }, [session, siteKey])
  useEffect(() => {
    if (!session) return
    let active = true
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
          <h1>{lock?.recipientName ? `${lock.recipientName}님께 도착한 선물` : '우리의 추억 열기'}</h1>
          <label htmlFor="site-unlock">전달받은 비밀번호를 입력해 주세요.</label>
          {lock?.passwordHint && <p className="site-hint">힌트: {lock.passwordHint}</p>}
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
          <h1>{content.mainText || content.specialOccasion}</h1>
          <p className="site-story">
            {content.specialDay} · {content.specialPlace}
          </p>
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
                  {music.title} · {music.artist}
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
          {content.letter && (
            <section className="site-story">
              <h2>편지</h2>
              <p>{content.letter}</p>
            </section>
          )}
          {content.linkUrl && (
            <a href={content.linkUrl} target="_blank" rel="noreferrer">
              연결된 사이트 열기
            </a>
          )}
        </>
      )}
    </main>
  )
}
