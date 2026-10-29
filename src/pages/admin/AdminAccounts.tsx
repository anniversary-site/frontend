import { useEffect, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import type { AdminAccount } from '../../types/admin'

export default function AdminAccounts({ me }: { me: AdminAccount | null }) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    api
      .getAdminAccounts()
      .then((items) => {
        if (active) setAccounts(items)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '운영자를 불러오지 못했어요.')
      })
    return () => {
      active = false
    }
  }, [revision])
  return (
    <section className="admin-content-panel">
      <h1>운영자 관리</h1>
      <p className="admin-section-note">
        운영자 권한은 모두 같아요. 계정은 삭제하지 않고 정지하거나 해제합니다.
      </p>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  {account.name}
                  {me?.id === account.id && ' (나)'}
                </td>
                <td>{account.email}</td>
                <td>{account.active ? '활성' : '정지'}</td>
                <td>
                  <button
                    className="admin-secondary"
                    disabled={
                      busy ||
                      account.id === me?.id ||
                      (account.active && accounts.filter((item) => item.active).length <= 1)
                    }
                    onClick={async () => {
                      setBusy(true)
                      setError('')
                      try {
                        await api.updateAdminAccount(account.id, !account.active)
                        setRevision((value) => value + 1)
                      } catch (cause) {
                        setError(cause instanceof Error ? cause.message : '변경하지 못했어요.')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {account.active ? '정지' : '해제'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="admin-account-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError('')
          try {
            await api.createAdminAccount({ email, name, password })
            setEmail('')
            setName('')
            setPassword('')
            setRevision((value) => value + 1)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '추가하지 못했어요.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2>운영자 추가</h2>
        <label className="admin-field">
          이름
          <input
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="admin-field">
          이메일
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="admin-field">
          임시 비밀번호
          <input
            type="password"
            required
            minLength={10}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
          <small>10~72자. 처음 로그인한 뒤 비밀번호를 변경하도록 안내해 주세요.</small>
        </label>
        <button
          className="admin-primary"
          disabled={busy || !name.trim() || !email || password.length < 10}
        >
          운영자 추가
        </button>
      </form>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
    </section>
  )
}
