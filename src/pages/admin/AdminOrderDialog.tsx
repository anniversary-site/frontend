import { useEffect, useRef, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import { AdminApiError } from '../../types/admin'
import type { AdminDetail } from '../../types/admin'
import { adminStatusLabels, anniversaryLabels } from '../../services/adminMockup'
import { formatPhone } from '../../utils/order'
import { NotificationCard } from './AdminNotifications'

export default function AdminOrderDialog({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: number
  onClose: () => void
  onChanged: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [detail, setDetail] = useState<AdminDetail | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('content'),
    [action, setAction] = useState<'PAYMENT' | 'DELIVERED' | 'CANCELED' | null>(null)
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [siteUrl, setSiteUrl] = useState(''),
    [note, setNote] = useState(''),
    [revision, setRevision] = useState(0)
  const operation = useRef(false)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  useEffect(() => {
    let active = true
    api
      .getAdminOrder(orderId)
      .then((data) => {
        if (active) setDetail(data)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '주문을 불러오지 못했어요.')
      })
    return () => {
      active = false
    }
  }, [orderId, revision])
  const refresh = () => {
    setRevision((value) => value + 1)
    onChanged()
  }
  const processOrder = async () => {
    if (!detail || !action || operation.current) return
    operation.current = true
    setBusy(true)
    setError('')
    setInvalidFields([])
    try {
      const result =
        action === 'PAYMENT'
          ? await api.confirmAdminPayment(orderId, detail.order.version, note || undefined)
          : await api.changeAdminOrderStatus(orderId, {
              status: action,
              expectedVersion: detail.order.version,
              ...(action === 'DELIVERED' ? { siteUrl } : {}),
              note: note || undefined,
            })
      setDetail(result)
      setAction(null)
      setSiteUrl('')
      setNote('')
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리하지 못했어요.')
      if (cause instanceof AdminApiError) setInvalidFields(cause.details.map((item) => item.field))
      if (
        cause instanceof AdminApiError &&
        ['ORDER_CONFLICT', 'INVALID_ORDER_STATE'].includes(cause.code)
      ) {
        setAction(null)
        try {
          setDetail(await api.getAdminOrder(orderId))
          onChanged()
        } catch (reloadError) {
          setDetail(null)
          setError(
            reloadError instanceof Error ? reloadError.message : '상세를 다시 불러오지 못했어요.',
          )
        }
      }
    } finally {
      operation.current = false
      setBusy(false)
    }
  }
  const order = detail?.order,
    content = detail?.content
  return (
    <dialog
      className="admin-order-dialog admin-detail-dialog"
      ref={dialog}
      aria-labelledby="admin-order-title"
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
      onCancel={(event) => {
        if (busy) event.preventDefault()
        else onClose()
      }}
    >
      <header>
        <div>
          <p className="admin-eyebrow">주문 상세</p>
          <h2 id="admin-order-title">
            {content?.customerName ? `${content.customerName}님의 주문` : '주문 확인'}
          </h2>
        </div>
        <button
          className="admin-close"
          aria-label="주문 상세 닫기"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {!detail && !error && <p role="status">주문을 불러오는 중이에요.</p>}
      {detail && order && content && (
        <>
          <dl className="admin-order-summary">
            {[
              ['주문번호', order.orderNo],
              ['제작 상태', adminStatusLabels[order.status]],
              [
                '입금 상태',
                order.payStatus === 'CONFIRMED'
                  ? '입금 확인'
                  : order.payStatus === 'REFUNDED'
                    ? '환불'
                    : '입금 전',
              ],
              ['결제 금액', `${order.totalPrice.toLocaleString('ko-KR')}원`],
              ['입금자명', order.depositorName],
              ['전화번호', formatPhone(content.phone ?? '')],
              [
                '사용 기간',
                `${content.useStartDate ?? '미정'} ~ ${content.useEndDate ?? '종료일 미정'}`,
              ],
              [
                '기념일 종류',
                content.anniversaryType === 'ETC'
                  ? (content.anniversaryEtcText ?? '기타')
                  : (anniversaryLabels[content.anniversaryType ?? ''] ?? '미정'),
              ],
              ['템플릿', content.template?.name ?? '미선택'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {order.siteUrl && /^https?:\/\//.test(order.siteUrl) && (
            <a className="admin-text-button" href={order.siteUrl} target="_blank" rel="noreferrer">
              완성 사이트 보기
            </a>
          )}
          {order.adminMemo && <p className="admin-readonly-note">관리자 메모: {order.adminMemo}</p>}
          <div className="admin-button-row">
            {order.status === 'SUBMITTED' && order.payStatus === 'PENDING' && (
              <button
                className="admin-primary"
                disabled={busy}
                onClick={() => setAction('PAYMENT')}
              >
                입금 확인
              </button>
            )}
            {order.status === 'IN_PROGRESS' && (
              <button
                className="admin-primary"
                disabled={busy}
                onClick={() => setAction('DELIVERED')}
              >
                납품 완료
              </button>
            )}
            {['SUBMITTED', 'IN_PROGRESS'].includes(order.status) && (
              <button
                className="admin-secondary admin-danger"
                disabled={busy}
                onClick={() => setAction('CANCELED')}
              >
                주문 취소
              </button>
            )}
          </div>
          {action && (
            <form
              className="admin-action-form"
              onSubmit={(event) => {
                event.preventDefault()
                void processOrder()
              }}
            >
              <h3>
                {action === 'PAYMENT'
                  ? '입금 확인'
                  : action === 'DELIVERED'
                    ? '납품 완료'
                    : '주문 취소'}
              </h3>
              <p className="admin-section-note">
                처리 후 되돌릴 수 없어요.
                {action === 'CANCELED'
                  ? ' 취소해도 입금 상태는 유지되며 환불은 별도로 처리해야 합니다.'
                  : ' 안내 문자가 만들어지며 운영자가 직접 발송해야 합니다.'}
              </p>
              {action === 'DELIVERED' && (
                <label className="admin-field">
                  완성 사이트 주소
                  <input
                    type="url"
                    required
                    pattern="https?://.*"
                    maxLength={500}
                    value={siteUrl}
                    onChange={(event) => setSiteUrl(event.target.value)}
                    aria-invalid={invalidFields.includes('siteUrl') || undefined}
                    placeholder="https://"
                  />
                </label>
              )}
              <label className="admin-field">
                처리 메모 (선택)
                <textarea
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                {invalidFields.includes('siteUrl') && <small role="alert">{error}</small>}
              </label>
              <div className="admin-button-row">
                <button className="admin-primary" disabled={busy}>
                  확인 후 처리
                </button>
                <button
                  className="admin-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setAction(null)}
                >
                  닫기
                </button>
              </div>
            </form>
          )}
          <nav className="admin-detail-tabs" aria-label="주문 상세 항목">
            {[
              ['content', '작성 내용'],
              ['requests', `요구사항 ${detail.requests.length}`],
              ['notifications', `문자 ${detail.notifications.length}`],
              ['logs', '처리 기록'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'content' && (
            <section className="admin-detail-content">
              <h3>문구</h3>
              <p>{content.mainText || '메인 문구 없음'}</p>
              <p>{content.subText || '서브 문구 없음'}</p>
              {content.documents.map((document) => (
                <section key={document.documentNo}>
                  <h3>document {document.documentNo}</h3>
                  <div className="admin-media-list">
                    {[...document.photos, ...document.videos].map((media) => (
                      <figure key={media.mediaId}>
                        {media.type === 'PHOTO' ? (
                          <img
                            src={media.url}
                            alt={media.caption || `사진 ${media.slot}`}
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={media.url}
                            poster={media.thumbnailUrl ?? undefined}
                            controls
                            preload="metadata"
                          />
                        )}
                        <figcaption>
                          {media.caption || media.title || `미디어 ${media.slot}`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  {!document.photos.length && !document.videos.length && (
                    <p className="admin-empty">첨부 파일이 없어요.</p>
                  )}
                </section>
              ))}
            </section>
          )}
          {tab === 'requests' && (
            <section>
              {!detail.requests.length && <p className="admin-empty">등록된 요구사항이 없어요.</p>}
              {detail.requests.map((item) => (
                <article key={item.requestId} className="admin-notification-card">
                  <strong>
                    {item.requestType} · {item.status}
                  </strong>
                  <p>{item.content}</p>
                  {item.adminReply && <p>답변: {item.adminReply}</p>}
                </article>
              ))}
            </section>
          )}
          {tab === 'notifications' && (
            <section>
              <p className="admin-section-note">직접 발송한 뒤 보냄으로 표시해 주세요.</p>
              {detail.notifications.map((item) => (
                <NotificationCard key={item.notificationId} item={item} onChanged={refresh} />
              ))}
              {!detail.notifications.length && <p className="admin-empty">문자 기록이 없어요.</p>}
            </section>
          )}
          {tab === 'logs' && (
            <section>
              {detail.auditLogs.map((log) => (
                <article className="admin-notification-card" key={log.id}>
                  <strong>
                    {log.adminName} · {log.action}
                  </strong>
                  <p>
                    {log.fromValue} → {log.toValue}
                  </p>
                  {log.note && <p>{log.note}</p>}
                  <small>
                    {new Date(log.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </small>
                </article>
              ))}
              {!detail.auditLogs.length && <p className="admin-empty">처리 기록이 없어요.</p>}
            </section>
          )}
        </>
      )}
    </dialog>
  )
}
