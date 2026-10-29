import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'
import { BASE_ORDER_PRICE, periodPrice } from '../utils/period'

export default function ReviewPage() {
  const { data, setToast } = useOrder()
  const pricing = periodPrice(data.date, data.endDate)
  return (
    <main key="review" className="order-content review-content page-transition">
      <p className="eyebrow">마지막으로 확인해 주세요</p>
      <h1>주문 상세보기</h1>
      <dl className="summary">
        {[
          ['템플릿 번호', `템플릿 ${data.template + 1}`],
          ['기념일 종류', data.occasion === '기타' ? data.other : data.occasion],
          ['이름', data.name],
          ['전화번호', data.phone],
          [
            '희망 수령 기간',
            data.date && data.endDate
              ? `${data.date.replaceAll('-', '.')} ~ ${data.endDate.replaceAll('-', '.')} (${pricing.days}일)`
              : '선택 안 함',
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="payment">
        <div>
          <span>기본 가격</span>
          <strong>{BASE_ORDER_PRICE.toLocaleString('ko-KR')}원</strong>
        </div>
        {pricing.extraFee > 0 && (
          <div>
            <span>기간 추가 요금</span>
            <strong>{pricing.extraFee.toLocaleString('ko-KR')}원</strong>
          </div>
        )}
        <div className="payment-total">
          <span>총 결제 금액</span>
          <strong>{pricing.total.toLocaleString('ko-KR')}원</strong>
        </div>
        <div>
          <span>입금 계좌</span>
          <b>국민 000000000000</b>
          <button
            aria-label="계좌번호 복사"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText('000000000000')
                setToast('계좌번호를 복사했어요.')
              } catch {
                setToast('국민 000000000000 — 직접 복사해 주세요.')
              }
            }}
          >
            <Icon name="copy" />
          </button>
        </div>
      </div>
    </main>
  )
}
