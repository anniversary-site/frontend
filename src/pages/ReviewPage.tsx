import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'
import { periodPrice } from '../utils/period'

export default function ReviewPage() {
  const { data, setToast, config, templates } = useOrder()
  const pricing = periodPrice(data.date, data.endDate)
  if (!config) return <p role="status">가격 정보를 불러오는 중이에요.</p>
  const account = config.bankAccount
  return (
    <main key="review" className="order-content review-content page-transition">
      <p className="eyebrow">마지막으로 확인해 주세요</p>
      <h1>주문 상세보기</h1>
      <dl className="summary">
        {[
          [
            '템플릿 번호',
            templates.find((item) => item.templateId === data.template)?.name ??
              `템플릿 ${data.template}`,
          ],
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
          <strong>{config.price.toLocaleString('ko-KR')}원</strong>
        </div>
        {pricing.extraFee > 0 && (
          <div>
            <span>기간 추가 요금</span>
            <strong>{pricing.extraFee.toLocaleString('ko-KR')}원</strong>
          </div>
        )}
        <div className="payment-total">
          <span>예상 결제 금액</span>
          <strong>{(config.price + pricing.extraFee).toLocaleString('ko-KR')}원</strong>
        </div>
        <div>
          <span>입금 계좌</span>
          <b>
            {account.bankName} {account.accountNumber} ({account.accountHolder})
          </b>
          <button
            aria-label="계좌번호 복사"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(account.accountNumber)
                setToast('계좌번호를 복사했어요.')
              } catch {
                setToast(`${account.bankName} ${account.accountNumber} — 직접 복사해 주세요.`)
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
