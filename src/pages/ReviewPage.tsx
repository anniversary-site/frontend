import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function ReviewPage() {
  const { data, setToast, config, templates, templateDetail } = useOrder()
  const pepero = (templateDetail ?? templates.find((item) => item.templateId === data.template))?.formType === 'PEPERO'
  if (!config) return <p role="status">가격 정보를 불러오는 중이에요.</p>
  const account = config.bankAccount
  return (
    <main key="review" className="order-content review-content page-transition">
      <p className="eyebrow">마지막으로 확인해 주세요</p>
      <h1>주문 상세보기</h1>
      <dl className="summary">
        {[
          [
            '템플릿',
            templates.find((item) => item.templateId === data.template)?.name ??
              `템플릿 ${data.template}`,
          ],
          ...(!pepero ? [['기념일 종류', data.occasion === '기타' ? data.other : data.occasion]] : []),
          ['이름', data.name],
          ['전화번호', data.phone],
          ...(!pepero ? [['받는 분 이름', data.recipientName]] : []),
          ['사이트 비밀번호', data.sitePasswordSet ? '설정 완료' : '미설정'],
          [
            '희망 수령 기간',
            data.date && data.endDate
              ? `${data.date.replaceAll('-', '.')} ~ ${data.endDate.replaceAll('-', '.')} (${data.price?.usageDays ?? 0}일)`
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
          <strong>{(data.price?.basePrice ?? 0).toLocaleString('ko-KR')}원</strong>
        </div>
        {(data.price?.periodFee ?? 0) > 0 && (
          <div>
            <span>기간 추가 요금</span>
            <strong>{data.price!.periodFee.toLocaleString('ko-KR')}원</strong>
          </div>
        )}
        {(['photoFee', 'videoFee'] as const).map((key) => (data.price?.[key] ?? 0) > 0 && (
          <div key={key}>
            <span>{key === 'photoFee' ? '사진 추가 요금' : '영상 추가 요금'}</span>
            <strong>{data.price![key].toLocaleString('ko-KR')}원</strong>
          </div>
        ))}
        <div className="payment-total">
          <span>예상 결제 금액</span>
          <strong>{(data.price?.totalPrice ?? 0).toLocaleString('ko-KR')}원</strong>
        </div>
        <div>
          <span>입금 계좌</span>
          <b>
            {account.bankName} {account.accountNumber}
            {account.accountHolder && ` (${account.accountHolder})`}
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
