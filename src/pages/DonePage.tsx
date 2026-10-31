import Icon from '../components/Icon'
import { useEffect, useState } from 'react'
import { useOrder } from '../context/OrderContext'
import * as api from '../services/API.js'
import type { OrderRequest } from '../services/API'

export default function DonePage() {
  const { order, session, setToast, reportError } = useOrder()
  const [requests, setRequests] = useState<OrderRequest[]>([])
  const [content, setContent] = useState('')
  const [requestType, setRequestType] = useState('INQUIRY')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (order && session)
      api
        .getOrderRequests(order.orderId, session.draftToken)
        .then((items) => {
          if (active) setRequests(items)
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : '요구사항을 불러오지 못했어요.')
        })
    return () => {
      active = false
    }
  }, [order, session])
  if (!order)
    return (
      <main className="done-content">
        <p role="status">주문 정보를 불러오는 중이에요.</p>
      </main>
    )
  const statuses: Record<string, string> = {
    SUBMITTED: '입금 대기',
    IN_PROGRESS: '제작 중',
    DELIVERED: '납품 완료',
    CANCELED: '취소',
  }
  return (
    <main key="done" className="done-content page-transition">
      <div className="done-icon">
        <Icon name="check" />
      </div>
      <h1>{order.status === 'SUBMITTED' ? '주문이 접수되었습니다.' : '주문 확인'}</h1>
      <dl className="summary">
        {[
          ['주문번호', order.orderNo],
          ['진행 상태', statuses[order.status] ?? order.status],
          [
            '결제 상태',
            order.payStatus === 'PENDING'
              ? '입금 전'
              : order.payStatus === 'CONFIRMED'
                ? '입금 확인'
                : '환불',
          ],
          ['결제 금액', `${order.totalPrice.toLocaleString('ko-KR')}원`],
          [
            '입금 계좌',
            `${order.bankAccount.bankName} ${order.bankAccount.accountNumber}${order.bankAccount.accountHolder ? ` (${order.bankAccount.accountHolder})` : ''}`,
          ],
          ['입금자명', order.depositorName],
          [
            '입금 기한',
            new Date(order.depositDeadline).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {order.siteUrl && (
        <a className="button primary" href={order.siteUrl} target="_blank" rel="noreferrer">
          완성된 사이트 보기
        </a>
      )}
      <p>
        입금 확인 후 제작을 시작해요.
        <br />
        진행 상황과 완성된 링크는 입력하신 번호로 알려드릴게요.
      </p>
      <section className="content-section">
        <h2>요구사항 및 문의</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session || sending || !content.trim()) return
            setSending(true)
            setError('')
            try {
              const item = await api.createOrderRequest(
                order.orderId,
                { content, requestType },
                session.draftToken,
              )
              setRequests((current) => [item, ...current])
              setContent('')
              setToast('요구사항을 등록했어요.')
            } catch (cause) {
              setError(reportError(cause))
            } finally {
              setSending(false)
            }
          }}
        >
          <label className="field-label">
            요청 종류
            <select
              className="text-input"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
            >
              <option value="INQUIRY">문의</option>
              <option value="REVISION">수정</option>
              <option value="ADDITION">추가</option>
              <option value="ETC">기타</option>
            </select>
          </label>
          <label className="field-label">
            내용
            <textarea
              className="text-input"
              value={content}
              maxLength={2000}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={sending || !content.trim() || order.status === 'CANCELED'}
          >
            요구사항 등록
          </button>
        </form>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {requests.map((item) => (
          <article key={item.requestId} className="content-section">
            <p>{item.content}</p>
            <small>
              {item.status} ·{' '}
              {new Date(item.requestedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
            </small>
            {item.adminReply && <p>답변: {item.adminReply}</p>}
          </article>
        ))}
      </section>
    </main>
  )
}
