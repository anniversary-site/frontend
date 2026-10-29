import { useOrder } from '../context/OrderContext'
import Calendar from '../components/Calendar'
import { formatPhone } from '../utils/order'
import { periodPrice } from '../utils/period'

export default function OrderInfoPage() {
  const { data, setData, update, touched, setTouched, setError } = useOrder()
  const pricing = periodPrice(data.date, data.endDate)
  return (
    <>
      <div className="page-heading">
        <h1>주문자 정보</h1>
        <p className="description">사이트 제작과 전달에 필요한 정보예요.</p>
      </div>
      <label className="name-field field-label">
        이름
        <input
          className="text-input"
          placeholder="이름을 입력해 주세요"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          onBlur={() => setTouched((state) => ({ ...state, name: true }))}
          aria-invalid={(touched.name && !data.name.trim()) || undefined}
          autoComplete="name"
          required
          maxLength={40}
        />
        {touched.name && !data.name.trim() && (
          <small className="field-error">이름을 입력해 주세요.</small>
        )}
      </label>
      <label className="phone-field field-label">
        전화번호<small>주문 확정·완료 알림을 받을 번호예요.</small>
        <input
          className="text-input"
          placeholder="010-0000-0000"
          value={data.phone}
          onChange={(e) => update('phone', formatPhone(e.target.value))}
          inputMode="numeric"
          maxLength={13}
          onBlur={() => setTouched((state) => ({ ...state, phone: true }))}
          aria-invalid={(touched.phone && !/^01\d-\d{3,4}-\d{4}$/.test(data.phone)) || undefined}
          aria-describedby={
            touched.phone && !/^01\d-\d{3,4}-\d{4}$/.test(data.phone) ? 'phone-error' : undefined
          }
          type="tel"
          autoComplete="tel"
          pattern="[0-9]{3}-?[0-9]{3,4}-?[0-9]{4}"
          required
        />
        {touched.phone && !/^01\d-\d{3,4}-\d{4}$/.test(data.phone) && (
          <small id="phone-error" className="field-error">
            휴대폰 번호를 확인해 주세요.
          </small>
        )}
      </label>
      <section className="calendar-section">
        <h2>희망 수령 기간 선택</h2>
        <p className="description">
          주문일 기준 7일 이후부터 시작할 수 있어요. 처음 7일은 무료예요.
        </p>
        <Calendar
          value={{ start: data.date, end: data.endDate }}
          onChange={(v) => {
            setData((current) => ({ ...current, date: v.start, endDate: v.end }))
            setError('')
          }}
        />
        <div className="period-summary" role="status" aria-live="polite">
          <p>
            <span>선택 기간</span>
            <strong>
              {data.date.replaceAll('-', '.')} ~ {data.endDate.replaceAll('-', '.')} ·{' '}
              {pricing.days}일
            </strong>
          </p>
          {pricing.extraFee > 0 ? (
            <div className="period-fee">
              <strong>추가 요금 {pricing.extraFee.toLocaleString('ko-KR')}원</strong>
              <span>
                무료 7일 + 추가 {pricing.extraDays}일 ({pricing.extraWeeks}주 요금)
              </span>
            </div>
          ) : (
            <p className="period-free">7일 이내로 선택하여 추가 요금이 없어요.</p>
          )}
          <small>
            시작일·종료일을 포함해 계산하며, 무료 7일 이후에는 7일 단위로 1,000원이 추가돼요.
          </small>
        </div>
      </section>
    </>
  )
}
