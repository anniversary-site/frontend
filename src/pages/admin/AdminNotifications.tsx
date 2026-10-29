import { useEffect, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import type { AdminNotification, AdminPageResult, NotificationStatus } from '../../types/admin'
import { formatPhone } from '../../utils/order'

const notificationLabels = { PENDING: '아직 안 보냄', SENT: '보냄', FAILED: '실패' }
const typeLabels: Record<string, string> = {
  SUBMITTED: '접수 안내',
  PAID: '입금 확인 안내',
  DELIVERED: '납품 안내',
}
export function NotificationCard({
  item,
  onChanged,
  onSelect,
}: {
  item: AdminNotification
  onChanged: () => void
  onSelect?: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const update = async (state: NotificationStatus) => {
    setBusy(true)
    setFeedback('')
    try {
      await api.updateAdminNotification(item.notificationId, state)
      onChanged()
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : '변경하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="admin-notification-card">
      <div className="admin-inline-heading">
        <strong>{typeLabels[item.type] ?? item.type}</strong>
        <span className="admin-status-badge">{notificationLabels[item.sendStatus]}</span>
      </div>
      <p>
        {item.customerName} · {formatPhone(item.phone)}
      </p>
      {onSelect && (
        <button className="admin-text-button" onClick={() => onSelect(item.orderId)}>
          {item.orderNo} 주문 보기
        </button>
      )}
      <pre className="admin-message-content">{item.content}</pre>
      <div className="admin-button-row">
        <button
          className="admin-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(item.content)
              setFeedback('문자 내용을 복사했어요. 직접 발송한 뒤 보냄으로 표시해 주세요.')
            } catch {
              setFeedback('복사하지 못했어요. 위 내용을 직접 선택해 복사해 주세요.')
            }
          }}
        >
          내용 복사
        </button>
        {(['SENT', 'PENDING', 'FAILED'] as const).map((state) => (
          <button
            key={state}
            className="admin-secondary"
            disabled={busy || state === item.sendStatus}
            onClick={() => update(state)}
          >
            {state === 'SENT'
              ? '보냄으로 표시'
              : state === 'PENDING'
                ? '안 보냄으로 되돌리기'
                : '실패로 표시'}
          </button>
        ))}
      </div>
      {item.sentAt && (
        <small>
          발송 표시: {new Date(item.sentAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </small>
      )}
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
    </article>
  )
}
export default function AdminNotifications({
  revision,
  onSelect,
  onChanged,
}: {
  revision: number
  onSelect: (id: number) => void
  onChanged: () => void
}) {
  const [state, setState] = useState('PENDING'),
    [page, setPage] = useState(0)
  const [result, setResult] = useState<AdminPageResult<AdminNotification> | null>(null)
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .getAdminNotifications({ sendStatus: state, page, size: 20 })
      .then((data) => {
        if (active) setResult(data)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '문자를 불러오지 못했어요.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [state, page, revision])
  return (
    <section className="admin-content-panel">
      <h1>문자 관리</h1>
      <p className="admin-section-note">
        문자는 자동 발송되지 않아요. 내용을 복사해 직접 보낸 뒤 상태를 표시해 주세요.
      </p>
      <label className="admin-field">
        발송 상태
        <select
          value={state}
          onChange={(event) => {
            setState(event.target.value)
            setPage(0)
          }}
        >
          <option value="">전체</option>
          {Object.entries(notificationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">문자를 불러오는 중이에요.</p>
      ) : (
        !error && (
          <>
            {result?.items.map((item) => (
              <NotificationCard
                key={item.notificationId}
                item={item}
                onSelect={onSelect}
                onChanged={onChanged}
              />
            ))}
            {!result?.items.length && <p className="admin-empty">해당하는 문자가 없어요.</p>}
            <div className="admin-pagination">
              <button
                className="admin-secondary"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                이전
              </button>
              <span>
                {result?.totalElements ?? 0}건 · {page + 1} / {Math.max(1, result?.totalPages ?? 0)}
              </span>
              <button
                className="admin-secondary"
                disabled={!result || page + 1 >= result.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                다음
              </button>
            </div>
          </>
        )
      )}
    </section>
  )
}
