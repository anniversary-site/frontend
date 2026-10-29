import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/AdminAPI.js'
import { calendarDate, koreaToday } from '../../services/adminMockup'
import type { AdminAccount, AdminSchedule } from '../../types/admin'
import AdminCalendar from './AdminCalendar'
import AdminOrders from './AdminOrders'
import AdminNotifications from './AdminNotifications'
import AdminAccounts from './AdminAccounts'
import AdminOrderDialog from './AdminOrderDialog'
import AdminPasswordDialog from './AdminPasswordDialog'
import './AdminPage.css'

const tabs = {
  calendar: '주문 일정',
  orders: '주문 목록',
  notifications: '문자 관리',
  accounts: '운영자 관리',
}
export default function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [today] = useState(koreaToday),
    [month, setMonth] = useState(() => today.slice(0, 7))
  const [tab, setTab] = useState<keyof typeof tabs>('calendar')
  const [orders, setOrders] = useState<AdminSchedule[]>([]),
    [weekOrders, setWeekOrders] = useState<AdminSchedule[]>([])
  const [selected, setSelected] = useState<number | null>(null),
    [me, setMe] = useState<AdminAccount | null>(null)
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api
      .getAdminMe()
      .then((data) => {
        if (active) setMe(data)
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : '운영자 정보를 불러오지 못했어요.')
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const [year, monthNumber] = month.split('-').map(Number)
    const weekStart = new Date(`${today}T00:00:00Z`)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
    Promise.all([
      api.getAdminSchedule(
        `${month}-01`,
        calendarDate(year, monthNumber - 1, new Date(year, monthNumber, 0).getDate()),
      ),
      api.getAdminSchedule(
        weekStart.toISOString().slice(0, 10),
        weekEnd.toISOString().slice(0, 10),
      ),
    ])
      .then(([monthly, weekly]) => {
        if (active) {
          setOrders(monthly)
          setWeekOrders(weekly)
        }
      })
      .catch((cause) => {
        if (active) {
          setOrders([])
          setWeekOrders([])
          setError(cause instanceof Error ? cause.message : '일정을 불러오지 못했어요.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [month, today, revision])
  const refresh = () => setRevision((value) => value + 1)
  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-logo" aria-label="URLUV 홈">
          URLUV
        </Link>
        <div className="admin-header-context">
          <span className="admin-role">운영자</span>
          <strong>{tabs[tab]}</strong>
        </div>
        <div className="admin-header-actions">
          <span className="admin-demo-label">
            {api.useAdminBackend ? (me?.name ?? '인증 연결 필요') : '샘플 데이터'}
          </span>
          <button className="admin-text-button" onClick={refresh}>
            새로고침
          </button>
          <button className="admin-text-button" onClick={() => setShowPassword(true)}>
            비밀번호 변경
          </button>
          <button className="admin-text-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="운영자 메뉴">
        {Object.entries(tabs).map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key as keyof typeof tabs)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="admin-error admin-page-error" role="alert">
          {error}
        </p>
      )}
      {tab === 'calendar' && (
        <AdminCalendar
          today={today}
          month={month}
          orders={orders}
          weekOrders={weekOrders}
          loading={loading}
          onMonthChange={setMonth}
          onSelect={setSelected}
        />
      )}
      {tab !== 'calendar' && (
        <main className="admin-content-layout">
          {tab === 'orders' && <AdminOrders revision={revision} onSelect={setSelected} />}
          {tab === 'notifications' && (
            <AdminNotifications revision={revision} onSelect={setSelected} onChanged={refresh} />
          )}
          {tab === 'accounts' && <AdminAccounts me={me} />}
        </main>
      )}
      {selected !== null && (
        <AdminOrderDialog
          key={selected}
          orderId={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
      {showPassword && <AdminPasswordDialog onClose={() => setShowPassword(false)} />}
    </div>
  )
}
