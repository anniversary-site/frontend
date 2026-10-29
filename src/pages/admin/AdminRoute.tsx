import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/AdminAPI.js'
import type { AdminSession } from '../../types/admin'
import { AdminApiError } from '../../types/admin'
import './AdminPage.css'

const AdminPage = lazy(() => import('./AdminPage'))

export default function AdminRoute() {
  const [session, setSession] = useState<AdminSession | null>(api.getAdminSession)
  const [checking, setChecking] = useState(() => Boolean(api.getAdminSession()))
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  const [verified, setVerified] = useState(false)
  const [fields, setFields] = useState<string[]>([])
  const logout = () => {
    api.clearAdminSession()
    setSession(null)
    setVerified(false)
    setChecking(false)
    setPassword('')
  }
  useEffect(() => {
    const expire = () => {
      api.clearAdminSession()
      setSession(null)
      setVerified(false)
      setChecking(false)
      setError('로그인이 만료되었어요. 다시 로그인해 주세요.')
    }
    window.addEventListener(api.ADMIN_UNAUTHORIZED_EVENT, expire)
    return () => window.removeEventListener(api.ADMIN_UNAUTHORIZED_EVENT, expire)
  }, [])
  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    const timer = window.setTimeout(
      () => {
        api.clearAdminSession()
        setSession(null)
        setVerified(false)
        setChecking(false)
        setError('로그인이 만료되었어요. 다시 로그인해 주세요.')
      },
      Math.max(0, remaining),
    )
    return () => clearTimeout(timer)
  }, [session])
  useEffect(() => {
    if (!session) return
    let active = true
    setChecking(true)
    api
      .getAdminMe()
      .then(() => {
        if (active) {
          setVerified(true)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) {
          setVerified(false)
          setError(cause instanceof Error ? cause.message : '로그인 상태를 확인하지 못했어요.')
        }
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [session, retry])
  if (session && verified && !checking)
    return (
      <Suspense
        fallback={
          <p className="route-loading" role="status">
            관리자 화면을 불러오는 중이에요.
          </p>
        }
      >
        <AdminPage onLogout={logout} />
      </Suspense>
    )
  return (
    <div className="admin-page admin-login-page">
      <header className="admin-header">
        <Link to="/" className="admin-logo">
          URLUV
        </Link>
        <span className="admin-role">운영자</span>
      </header>
      <main className="admin-login-main">
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <p className="admin-eyebrow">URLUV ADMIN</p>
          <h1 id="admin-login-title">운영자 로그인</h1>
          <p className="admin-section-note">운영자 계정으로 로그인해 주문을 관리하세요.</p>
          {checking ? (
            <p role="status">로그인 상태를 확인하는 중이에요.</p>
          ) : session ? (
            <>
              <p role="alert" className="admin-error">
                {error}
              </p>
              <div className="admin-button-row">
                <button className="admin-primary" onClick={() => setRetry((value) => value + 1)}>
                  다시 확인
                </button>
                <button className="admin-secondary" onClick={logout}>
                  다시 로그인
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                if (busy || !email.trim() || !password) return
                setBusy(true)
                setError('')
                setFields([])
                try {
                  const result = await api.loginAdmin(email.trim(), password)
                  setPassword('')
                  setSession(result)
                } catch (cause) {
                  if (cause instanceof AdminApiError) {
                    setFields(cause.details.map((item) => item.field))
                    setError(
                      cause.code === 'INVALID_CREDENTIALS'
                        ? '이메일 또는 비밀번호를 확인해 주세요.'
                        : cause.status === 429
                          ? '로그인 시도가 많아 잠시 차단됐어요. 10분 뒤 다시 시도해 주세요.'
                          : cause.message,
                    )
                  } else setError(cause instanceof Error ? cause.message : '로그인하지 못했어요.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <label className="admin-field">
                이메일
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fields.includes('email') || undefined}
                />
              </label>
              <label className="admin-field">
                비밀번호
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={fields.includes('password') || undefined}
                />
              </label>
              {error && (
                <p role="alert" className="admin-error">
                  {error}
                </p>
              )}
              <button
                className="admin-primary admin-login-submit"
                disabled={busy || !email.trim() || !password}
              >
                {busy ? '로그인 중…' : '로그인'}
              </button>
              {!api.useAdminBackend && (
                <p className="admin-demo-credentials">
                  목업 계정
                  <br />
                  admin@urluv.local / demo-password
                </p>
              )}
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
