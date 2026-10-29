import { useEffect, useRef, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import { AdminApiError } from '../../types/admin'

export default function AdminPasswordDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [field, setField] = useState(''),
    [saved, setSaved] = useState(false)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="admin-order-dialog"
      aria-labelledby="password-title"
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
      onCancel={(event) => {
        if (busy) event.preventDefault()
        else onClose()
      }}
    >
      <header>
        <h2 id="password-title">비밀번호 변경</h2>
        <button
          className="admin-close"
          onClick={onClose}
          disabled={busy}
          aria-label="비밀번호 변경 닫기"
        >
          ×
        </button>
      </header>
      {saved ? (
        <>
          <p className="admin-section-note" role="status">
            비밀번호를 변경했어요.
          </p>
          <button className="admin-primary" onClick={onClose}>
            확인
          </button>
        </>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy) return
            if (password !== confirm) {
              setError('새 비밀번호가 일치하지 않아요.')
              setField('confirm')
              return
            }
            setBusy(true)
            setError('')
            setField('')
            try {
              await api.changeAdminPassword(current, password)
              setCurrent('')
              setPassword('')
              setConfirm('')
              setSaved(true)
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : '변경하지 못했어요.')
              if (cause instanceof AdminApiError)
                setField(
                  cause.code === 'WRONG_CURRENT_PASSWORD'
                    ? 'currentPassword'
                    : (cause.details[0]?.field ?? ''),
                )
            } finally {
              setBusy(false)
            }
          }}
        >
          <p className="admin-section-note">
            임시 비밀번호로 처음 로그인했다면 새 비밀번호로 변경해 주세요.
          </p>
          <label className="admin-field">
            현재 비밀번호
            <input
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              aria-invalid={field === 'currentPassword' || undefined}
            />
          </label>
          <label className="admin-field">
            새 비밀번호
            <input
              type="password"
              required
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={['newPassword', 'password'].includes(field) || undefined}
            />
            <small>10~72자로 입력해 주세요.</small>
          </label>
          <label className="admin-field">
            새 비밀번호 확인
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={field === 'confirm' || undefined}
            />
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button
            className="admin-primary"
            disabled={busy || !current || password.length < 10 || !confirm}
          >
            {busy ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </dialog>
  )
}
