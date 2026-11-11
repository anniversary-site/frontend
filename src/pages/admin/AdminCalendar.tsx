import { useState } from 'react'
import {
  adminStatusLabels,
  calendarDate,
  koreaToday,
  ordersThisWeek,
} from '../../services/adminMockup'
import type { AdminSchedule } from '../../types/admin'
import AdminPendingMessages from './AdminPendingMessages'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
const dayOffset = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5)

/**
 * 한 주(이번 달 안쪽 [weekStart, weekEnd])에 걸친 주문을 막대로 바꿉니다.
 * firstColumn은 weekStart의 요일 칸, span은 weekEnd까지 남은 날 수입니다.
 * 겹치지 않는 주문은 같은 줄을 나눠 써서 빈 줄이 생기지 않게 합니다.
 */
function weekBars(
  orders: AdminSchedule[],
  weekStart: string,
  weekEnd: string,
  firstColumn: number,
  span: number,
) {
  const bars = orders
    .filter(
      (order) =>
        order.useStartDate <= weekEnd && (order.useEndDate ?? order.useStartDate) >= weekStart,
    )
    .map((order) => {
      const end = order.useEndDate ?? order.useStartDate
      return {
        order,
        start: firstColumn + Math.max(0, dayOffset(weekStart, order.useStartDate)),
        end: firstColumn + Math.min(span, dayOffset(weekStart, end)),
        startsHere: order.useStartDate >= weekStart,
        endsHere: end <= weekEnd,
        lane: 0,
      }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end || a.order.orderId - b.order.orderId)
  const laneEnds: number[] = []
  for (const bar of bars) {
    const lane = laneEnds.findIndex((laneEnd) => laneEnd < bar.start)
    bar.lane = lane === -1 ? laneEnds.length : lane
    laneEnds[bar.lane] = bar.end
  }
  return bars
}

export default function AdminCalendar({
  today,
  month,
  orders: allOrders,
  weekOrders: allWeekOrders,
  loading,
  onMonthChange,
  onSelect,
  revision = 0,
}: {
  today: string
  month: string
  orders: AdminSchedule[]
  weekOrders: AdminSchedule[]
  loading: boolean
  onMonthChange: (month: string) => void
  onSelect: (orderId: number) => void
  revision?: number
}) {
  const [filters, setFilters] = useState({ delivered: false, ongoing: true, canceled: false })
  const visible = (order: AdminSchedule) => order.status === 'DELIVERED'
    ? filters.delivered
    : order.status === 'CANCELED' ? filters.canceled : filters.ongoing
  const orders = allOrders.filter(visible)
  const weekOrders = allWeekOrders.filter(visible)
  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = monthNumber - 1
  const leading = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthNumber, 0).getDate()
  const deadlines = ordersThisWeek(weekOrders, today)
  const moveMonth = (offset: number) => {
    const date = new Date(year, monthIndex + offset, 1)
    onMonthChange(calendarDate(date.getFullYear(), date.getMonth(), 1).slice(0, 7))
  }

  return (
    <main className="admin-layout">
      <div className="admin-sidebar">
      <aside className="admin-deadlines" aria-labelledby="deadline-title">
        <div className="admin-deadline-heading">
          <div>
            <p className="admin-eyebrow">이번주</p>
            <h1 id="deadline-title">마감 일정</h1>
          </div>
          <span className="admin-count">{deadlines.length}건</span>
        </div>
        <div className="admin-deadline-list">
          {deadlines.map((order) => (
            <button
              className="admin-deadline"
              key={order.orderId}
              onClick={() => onSelect(order.orderId)}
            >
              <time dateTime={order.dueDate}>
                <strong>{Number(order.dueDate.slice(-2))}</strong>
                <span>{weekdays[new Date(`${order.dueDate}T00:00:00`).getDay()]}</span>
              </time>
              <span className="admin-deadline-customer">
                <strong>{order.customerName}</strong>
                <small>{order.templateName}</small>
              </span>
              <span className={`admin-deadline-status admin-deadline-${order.status.toLowerCase()}`}>
                {adminStatusLabels[order.status]}
              </span>
            </button>
          ))}
          {!deadlines.length && <p className="admin-empty">이번 주 마감 일정이 없어요.</p>}
        </div>
      </aside>
        <AdminPendingMessages revision={revision} onSelect={onSelect} />
      </div>
      <section className="admin-calendar" aria-labelledby="admin-month-title">
        <div className="admin-calendar-heading">
          <h2 id="admin-month-title" aria-live="polite">
            {year}년 {monthNumber}월
          </h2>
          <nav aria-label="달력 이동">
            <button aria-label="이전 달" onClick={() => moveMonth(-1)}>
              ‹
            </button>
            <button
              className="admin-today-button"
              onClick={() => onMonthChange(koreaToday().slice(0, 7))}
            >
              오늘
            </button>
            <button aria-label="다음 달" onClick={() => moveMonth(1)}>
              ›
            </button>
          </nav>
        </div>
        <div className="admin-calendar-toolbar">
          <p className="admin-calendar-legend">기간막대는 사용기간입니다</p>
          <fieldset className="admin-calendar-filters" aria-label="주문 상태 필터">
            {([
              ['delivered', '납품완료'],
              ['ongoing', '진행 중'],
              ['canceled', '주문 취소'],
            ] as const).map(([key, label]) => (
              <label key={key}>
                <input type="checkbox" checked={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.checked }))} />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        {loading && (
          <p role="status" className="admin-empty">
            일정을 불러오는 중이에요.
          </p>
        )}
        <div
          className="admin-calendar-scroll"
          role="region"
          aria-label={`${year}년 ${monthNumber}월 주문 일정`}
          tabIndex={0}
        >
          <div className="admin-weekdays" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="admin-calendar-grid">
            {Array.from({ length: 6 }, (_, week) => {
              // 이번 주(이번 달 안쪽)에 걸친 주문을 한 줄짜리 막대로 그립니다.
              const firstDay = Math.max(1, week * 7 - leading + 1)
              const lastDay = Math.min(days, week * 7 - leading + 7)
              const weekStart = calendarDate(year, monthIndex, firstDay)
              const weekEnd = calendarDate(year, monthIndex, lastDay)
              const bars =
                firstDay <= lastDay
                  ? weekBars(orders, weekStart, weekEnd, (firstDay + leading - 1) % 7, lastDay - firstDay)
                  : []
              const lanes = bars.reduce((count, bar) => Math.max(count, bar.lane + 1), 0)
              return (
                <div
                  key={week}
                  className="admin-calendar-week"
                  style={{
                    gridTemplateRows: ['44px', ...Array(lanes).fill('36px'), 'minmax(12px, 1fr)'].join(' '),
                    minHeight: Math.max(118, 44 + lanes * 36 + 12),
                  }}
                >
                  {Array.from({ length: 7 }, (_, column) => {
                    const index = week * 7 + column
                    const day = index - leading + 1
                    const style = { gridColumn: column + 1 }
                    if (day < 1 || day > days)
                      return (
                        <div
                          key={index}
                          className="admin-calendar-cell admin-outside"
                          style={style}
                          aria-hidden="true"
                        />
                      )
                    const date = calendarDate(year, monthIndex, day)
                    return (
                      <div
                        key={index}
                        className={`admin-calendar-cell ${column === 0 ? 'admin-sunday' : ''}`}
                        style={style}
                      >
                        <time
                          dateTime={date}
                          className={`admin-day ${date === today ? 'admin-is-today' : ''}`}
                          aria-current={date === today ? 'date' : undefined}
                        >
                          {day}
                        </time>
                      </div>
                    )
                  })}
                  {bars.map(({ order, start, end, lane, startsHere, endsHere }) => {
                    const deadline = order.dueDate >= weekStart && order.dueDate <= weekEnd
                    const period = `${shortDate(order.useStartDate)} ~ ${shortDate(order.useEndDate ?? order.useStartDate)}`
                    return (
                      <button
                        key={order.orderId}
                        className={`admin-order-chip admin-period-bar admin-period-${order.status.toLowerCase()} ${startsHere ? 'admin-period-start' : 'admin-period-continues'} ${endsHere ? 'admin-period-end' : ''} ${deadline && startsHere ? 'admin-is-deadline' : ''}`}
                        style={{ gridColumn: `${start + 1} / ${end + 2}`, gridRow: lane + 2 }}
                        onClick={() => onSelect(order.orderId)}
                        title={`${order.customerName} · ${order.templateName} · 사용 기간 ${period}`}
                        aria-label={`${order.customerName}, 사용 기간 ${period}, ${deadline ? `제작 마감 ${shortDate(order.dueDate)}, ` : ''}${adminStatusLabels[order.status]}, 주문 상세 보기`}
                      >
                        <span aria-hidden="true" className="admin-order-dot" />
                        <span className="admin-period-label">
                          {deadline && startsHere ? '마감 · ' : ''}
                          {order.customerName}
                          <small> {order.templateName}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
        {!loading && !orders.length && (
          <p className="admin-empty admin-month-empty" role="status">
            이번 달 등록된 주문 일정이 없어요.
          </p>
        )}
      </section>
    </main>
  )
}
