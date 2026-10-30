import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import Icon from './Icon'
import { dateKey, minDate } from '../utils/order'

interface DateRange {
  start: string
  end: string
}
interface CalendarProps {
  minDateValue?: string
  value: DateRange
  onChange: (value: DateRange) => void
}

export default function Calendar({ value, onChange, minDateValue }: CalendarProps) {
  const min = minDateValue ? new Date(`${minDateValue}T00:00:00`) : minDate()
  const [choosingEnd, setChoosingEnd] = useState(false)
  const drag = useRef<{ pointerId: number; anchor: string; end: string } | null>(null)
  const [preview, setPreview] = useState<DateRange | null>(null)
  const selected = preview ?? value
  const range = (a: string, b: string): DateRange =>
    a <= b ? { start: a, end: b } : { start: b, end: a }
  const dateAt = (event: PointerEvent<HTMLDivElement>) => {
    const button = event.currentTarget.ownerDocument
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('button[data-date]')
    return button && event.currentTarget.contains(button) && !button.disabled
      ? button.dataset.date
      : undefined
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    const key = dateAt(event)
    if (key) {
      current.end = key
      setPreview(range(current.anchor, key))
    }
  }
  const [month, setMonth] = useState(() => {
    const date = value.start ? new Date(`${value.start}T00:00:00`) : min
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const leading = new Date(year, monthIndex, 1).getDay()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const today = dateKey(new Date())
  const selectDate = (key: string) => {
    if (!choosingEnd || !value.start) {
      onChange({ start: key, end: key })
      setChoosingEnd(true)
      return
    }
    onChange(
      key < value.start ? { start: key, end: value.start } : { start: value.start, end: key },
    )
    setChoosingEnd(false)
  }

  return (
    <div className="calendar">
      <div className="calendar-heading">
        <button
          type="button"
          aria-label="이전 달"
          disabled={month <= new Date(min.getFullYear(), min.getMonth(), 1)}
          onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
        >
          <Icon name="back" />
        </button>
        <strong>
          {year}년 {monthIndex + 1}월
        </strong>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
        >
          <Icon name="next" />
        </button>
      </div>
      <div className="weekdays">
        {'일월화수목금토'.split('').map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className="calendar-days range-calendar"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          const key = dateAt(event)
          if (!key) return
          const anchor = key === value.start ? value.end : key === value.end ? value.start : key
          drag.current = { pointerId: event.pointerId, anchor: anchor || key, end: key }
          setPreview(range(anchor || key, key))
          setChoosingEnd(false)
          event.currentTarget.setPointerCapture(event.pointerId)
          event.preventDefault()
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          move(event)
          const current = drag.current
          if (!current || current.pointerId !== event.pointerId) return
          onChange(range(current.anchor, current.end))
          drag.current = null
          setPreview(null)
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { drag.current = null; setPreview(null) }}
        onLostPointerCapture={() => { drag.current = null; setPreview(null) }}
      >
        {Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
          const day = index - leading + 1
          if (day < 1 || day > count) return <span className="calendar-empty" key={index} />
          const date = new Date(year, monthIndex, day)
          const key = dateKey(date)
          const inRange = Boolean(
            selected.start && selected.end && key >= selected.start && key <= selected.end,
          )
          const isStart = key === selected.start
          const isEnd = key === selected.end
          const classes = [
            'calendar-day',
            inRange && 'in-range',
            isStart && 'range-start',
            isEnd && 'range-end',
            key === today && 'today',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div className={classes} key={index}>
              <button
                type="button"
                data-date={key}
                disabled={date < min}
                aria-label={`${year}년 ${monthIndex + 1}월 ${day}일${isStart ? ', 시작일' : ''}${isEnd ? ', 종료일' : ''}`}
                aria-pressed={inRange}
                className={isStart || isEnd ? 'range-endpoint' : ''}
                onClick={(event) => { if (event.detail === 0) selectDate(key) }}
              >
                <span>{day}</span>
              </button>
            </div>
          )
        })}
      </div>
      <p className="calendar-instruction" aria-live="polite">
        {choosingEnd
          ? '종료일을 선택해 주세요.'
          : '날짜를 누른 채 드래그해 기간을 선택하세요. 시작일·종료일을 끌어 조정할 수 있어요. 키보드는 두 날짜를 차례로 선택하세요.'}
      </p>
    </div>
  )
}
