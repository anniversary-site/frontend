import { useEffect, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import type { AdminNotification } from '../../types/admin'
import { notificationTypeLabels as typeLabels } from '../../services/adminMockup'

export default function AdminPendingMessages({
  revision,
  onSelect,
}: {
  revision: number
  onSelect: (id: number) => void
}) {
  const [items, setItems] = useState<(AdminNotification & { templateName: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const first = await api.getAdminNotifications({ sendStatus: 'PENDING', page: 0, size: 100 })
        const notifications = [...first.items]
        for (let page = 1; page < first.totalPages; page++) {
          if (!active) return
          const result = await api.getAdminNotifications({ sendStatus: 'PENDING', page, size: 100 })
          notifications.push(...result.items)
        }
        const names = new Map<number, string>()
        await Promise.all(
          [...new Set(notifications.map((item) => item.orderId))].map(async (id) => {
            const detail = await api.getAdminOrder(id)
            names.set(id, detail.content.template?.name ?? '')
          }),
        )
        if (active)
          setItems(
            notifications.map((item) => ({
              ...item,
              templateName: names.get(item.orderId) ?? '',
            })),
          )
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '문자를 불러오지 못했어요.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [revision])
  return (
    <section className="admin-deadlines" aria-labelledby="pending-message-title">
      <div className="admin-deadline-heading">
        <h2 id="pending-message-title">미발송 문자</h2>
        <span className="admin-count">{loading || error ? '—' : `${items.length}건`}</span>
      </div>
      <div className="admin-deadline-list">
        {loading ? (
          <p className="admin-empty" role="status">
            불러오는 중이에요.
          </p>
        ) : error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : (
          items.map((item) => (
            <button
              className="admin-deadline"
              key={item.notificationId}
              onClick={() => onSelect(item.orderId)}
            >
              <span className="admin-deadline-customer">
                <strong>{item.customerName}</strong>
                <small>{item.templateName}</small>
              </span>
              <span className="admin-deadline-status">{typeLabels[item.type] ?? item.type}</span>
            </button>
          ))
        )}
        {!loading && !error && !items.length && (
          <p className="admin-empty">미발송 문자가 없어요.</p>
        )}
      </div>
    </section>
  )
}
