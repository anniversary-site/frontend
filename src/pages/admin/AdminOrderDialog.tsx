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
  // 납품 전에 운영자가 완성 사이트를 직접 열어 봐야 납품 완료를 누를 수 있어요.
  const [previewed, setPreviewed] = useState(false),
    [previewing, setPreviewing] = useState(false)
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
  const openPreview = async () => {
    if (previewing) return
    // 팝업 차단을 피하려고 클릭하자마자 새 탭을 먼저 엽니다.
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    setPreviewing(true)
    setError('')
    try {
      const { url } = await api.getAdminSitePreview(orderId)
      if (tab) tab.location.href = url
      else window.location.assign(url)
      setPreviewed(true)
    } catch (cause) {
      tab?.close()
      setError(cause instanceof Error ? cause.message : '미리보기를 열지 못했어요.')
    } finally {
      setPreviewing(false)
    }
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
              ['받는 분 이름', content.recipientName ?? '-'],
              ['비밀번호 힌트', content.sitePasswordHint ?? '-'],
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
              ['사이트 비밀번호', order.sitePasswordSet ? '설정 완료' : '미설정'],
              ['사이트 키', order.siteKey ?? '미발급'],
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
          {order.status === 'IN_PROGRESS' && !previewed && (
            <p className="admin-section-note">
              사이트 미리보기로 사진·편지까지 확인한 뒤 납품 완료를 누를 수 있어요.
            </p>
          )}
          {order.adminMemo && <p className="admin-readonly-note">관리자 메모: {order.adminMemo}</p>}
          <div className="admin-button-row">
            {order.siteKey && ['SUBMITTED', 'IN_PROGRESS', 'DELIVERED'].includes(order.status) && (
              <button
                className="admin-secondary"
                type="button"
                disabled={previewing}
                onClick={() => void openPreview()}
                title="비밀번호 없이 30분 동안 열려요"
              >
                {previewing ? '여는 중…' : previewed ? '사이트 다시 미리보기' : '사이트 미리보기'}
              </button>
            )}
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
                disabled={busy || !previewed}
                title={previewed ? undefined : '사이트 미리보기로 내용을 확인한 뒤 누를 수 있어요'}
                onClick={() => {
                  // 템플릿 사이트 주소를 미리 채웁니다. 다른 주소로 바꿀 수도 있어요.
                  setSiteUrl(order.defaultSiteUrl ?? '')
                  setAction('DELIVERED')
                }}
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
                    required={!order.defaultSiteUrl}
                    pattern="https?://.*"
                    maxLength={500}
                    value={siteUrl}
                    onChange={(event) => setSiteUrl(event.target.value)}
                    aria-invalid={invalidFields.includes('siteUrl') || undefined}
                    placeholder={order.defaultSiteUrl ?? 'https://'}
                  />
                  {order.defaultSiteUrl && (
                    <small>템플릿 사이트 주소를 자동으로 채웠어요. 비워 두어도 이 주소로 납품돼요.</small>
                  )}
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
              {content.mainText && <p>메인 문구: {content.mainText}</p>}
              <p>특별한 날: {content.specialDay || '-'}</p>
              <p>특별한 장소: {content.specialPlace || '-'}</p>
              <p>기념일: {content.specialOccasion || '-'}</p>
              {(content.musics ?? []).map((music, index) => (
                <p key={`music-${index}`}>
                  {music.title} · {music.artist} · {music.youtubeUrl}
                </p>
              ))}
              <p style={{ whiteSpace: 'pre-wrap' }}>{content.letter || '편지 없음'}</p>
              <p>{content.linkUrl || '연결 URL 없음'}</p>
              <p>편지 선택: {content.letterChoice === 'AI' ? 'AI 문장' : content.letterChoice === 'ORIGINAL' ? '원문' : '미선택'}</p>
              {content.price && (
                <dl>
                  {([
                    ['기본 가격', content.price.basePrice],
                    ['기간 추가 요금', content.price.periodFee],
                    ['사진 추가 요금', content.price.photoFee],
                    ['영상 추가 요금', content.price.videoFee],
                    ['총 금액', content.price.totalPrice],
                  ] as const).map(([label, amount]) => (
                    <div key={label}><dt>{label}</dt><dd>{amount.toLocaleString('ko-KR')}원</dd></div>
                  ))}
                </dl>
              )}
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
