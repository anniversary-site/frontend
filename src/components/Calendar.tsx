import { useState } from 'react'
import Icon from './Icon'
import { dateKey, minDate } from '../utils/order'
import { addDays, FREE_PERIOD_DAYS } from '../utils/period'

interface DateRange {
  start: string
  end: string
}
interface CalendarProps {
  value: DateRange
  onChange: (value: DateRange) => void
}

export default function Calendar({ value, onChange }: CalendarProps) {
  const min = minDate()
  const [choosingEnd, setChoosingEnd] = useState(false)
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
      onChange({ start: key, end: addDays(key, FREE_PERIOD_DAYS - 1) })
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
      <div className="calendar-days range-calendar">
        {Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
          const day = index - leading + 1
          if (day < 1 || day > count) return <span className="calendar-empty" key={index} />
          const date = new Date(year, monthIndex, day)
          const key = dateKey(date)
          const inRange = Boolean(
            value.start && value.end && key >= value.start && key <= value.end,
          )
          const isStart = key === value.start
          const isEnd = key === value.end
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
                disabled={date < min}
                aria-label={`${year}년 ${monthIndex + 1}월 ${day}일${isStart ? ', 시작일' : ''}${isEnd ? ', 종료일' : ''}`}
                aria-pressed={inRange}
                className={isStart || isEnd ? 'range-endpoint' : ''}
                onClick={() => selectDate(key)}
              >
                <span>{day}</span>
              </button>
            </div>
          )
        })}
      </div>
      <p className="calendar-instruction" aria-live="polite">
        {choosingEnd
          ? '종료일을 선택해 주세요. 다시 선택하면 기간이 조정돼요.'
          : '시작일을 고르면 기본 7일이 선택돼요. 두 번째 날짜로 종료일을 정하세요.'}
      </p>
    </div>
  )
}
