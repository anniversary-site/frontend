import {
  adminStatusLabels,
  calendarDate,
  koreaToday,
  ordersThisWeek,
} from '../../services/adminMockup'
import type { AdminSchedule } from '../../types/admin'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export default function AdminCalendar({
  today,
  month,
  orders,
  weekOrders,
  loading,
  onMonthChange,
  onSelect,
}: {
  today: string
  month: string
  orders: AdminSchedule[]
  weekOrders: AdminSchedule[]
  loading: boolean
  onMonthChange: (month: string) => void
  onSelect: (orderId: number) => void
}) {
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
              <span className="admin-deadline-status">{adminStatusLabels[order.status]}</span>
            </button>
          ))}
          {!deadlines.length && <p className="admin-empty">이번 주 마감 일정이 없어요.</p>}
        </div>
      </aside>
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
        <p className="admin-calendar-legend">
          기간 막대는 사용 기간, 마감 표시는 제작 마감일이에요.
        </p>
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
            {Array.from({ length: 42 }, (_, index) => {
              const day = index - leading + 1
              if (day < 1 || day > days)
                return (
                  <div
                    key={index}
                    className="admin-calendar-cell admin-outside"
                    aria-hidden="true"
                  />
                )
              const date = calendarDate(year, monthIndex, day)
              const weekStart = calendarDate(year, monthIndex, Math.max(1, day - (index % 7)))
              const weekEnd = calendarDate(year, monthIndex, Math.min(days, day + 6 - (index % 7)))
              const items = orders.filter(
                (order) =>
                  order.useStartDate <= weekEnd &&
                  (order.useEndDate ?? order.useStartDate) >= weekStart,
              )
              return (
                <div
                  key={index}
                  className={`admin-calendar-cell ${index % 7 === 0 ? 'admin-sunday' : ''}`}
                >
                  <time
                    dateTime={date}
                    className={`admin-day ${date === today ? 'admin-is-today' : ''}`}
                    aria-current={date === today ? 'date' : undefined}
                  >
                    {day}
                  </time>
                  <div className="admin-day-orders">
                    {items.map((order) =>
                      order.useStartDate > date ||
                      (order.useEndDate ?? order.useStartDate) < date ? (
                        <span
                          key={order.orderId}
                          className="admin-period-spacer"
                          aria-hidden="true"
                        />
                      ) : (
                        <button
                          key={order.orderId}
                          className={`admin-order-chip ${date === order.useStartDate || index % 7 === 0 || day === 1 ? 'admin-period-start' : 'admin-period-continues'} ${date === (order.useEndDate ?? order.useStartDate) || index % 7 === 6 || day === days ? 'admin-period-end' : ''} ${order.dueDate === date ? 'admin-is-deadline' : ''}`}
                          onClick={() => onSelect(order.orderId)}
                          aria-label={`${monthNumber}월 ${day}일 ${order.customerName}, ${order.dueDate === date ? '제작 마감일, ' : ''}${adminStatusLabels[order.status]}, 주문 상세 보기`}
                        >
                          <span aria-hidden="true" className="admin-order-dot" />
                          {order.dueDate === date ? '마감 · ' : ''}
                          {order.customerName}
                        </button>
                      ),
                    )}
                  </div>
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
