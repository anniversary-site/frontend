import { useEffect, useState } from 'react'
import * as api from '../../services/AdminAPI.js'
import { adminStatusLabels } from '../../services/adminMockup'
import type { AdminOrder, AdminPageResult, OrderFilters } from '../../types/admin'
import { formatPhone } from '../../utils/order'

export default function AdminOrders({
  revision,
  onSelect,
}: {
  revision: number
  onSelect: (id: number) => void
}) {
  const [keyword, setKeyword] = useState(''),
    [filters, setFilters] = useState<OrderFilters>({ page: 0, size: 20 })
  const [result, setResult] = useState<AdminPageResult<AdminOrder> | null>(null)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .getAdminOrders(filters)
      .then((data) => {
        if (active) setResult(data)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '주문을 불러오지 못했어요.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters, revision])
  const page = filters.page ?? 0
  return (
    <section className="admin-content-panel">
      <h1>주문 목록</h1>
      <form
        className="admin-filter-bar"
        onSubmit={(event) => {
          event.preventDefault()
          setFilters((current) => ({ ...current, keyword: keyword.trim(), page: 0 }))
        }}
      >
        <label className="admin-field">
          주문 상태
          <select
            value={filters.status ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value, page: 0 }))
            }
          >
            <option value="">전체 (작성 중 제외)</option>
            {Object.entries(adminStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          입금 상태
          <select
            value={filters.payStatus ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, payStatus: event.target.value, page: 0 }))
            }
          >
            <option value="">전체</option>
            <option value="PENDING">입금 전</option>
            <option value="CONFIRMED">입금 확인</option>
            <option value="REFUNDED">환불</option>
          </select>
        </label>
        <label className="admin-field admin-search">
          주문 검색
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="주문번호·이름·전화번호"
          />
        </label>
        <button className="admin-secondary" type="submit">
          검색
        </button>
      </form>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">주문을 불러오는 중이에요.</p>
      ) : (
        !error && (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>주문자</th>
                    <th>템플릿</th>
                    <th>사용 기간</th>
                    <th>상태</th>
                    <th>금액</th>
                    <th>미발송 문자</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.items.map((item) => (
                    <tr key={item.orderId}>
                      <td>
                        <button
                          className="admin-text-button"
                          onClick={() => onSelect(item.orderId)}
                        >
                          {item.orderNo}
                        </button>
                      </td>
                      <td>
                        {item.customerName}
                        <small>{formatPhone(item.phone)}</small>
                      </td>
                      <td>{item.templateName}</td>
                      <td>
                        {item.useStartDate}
                        <small>{item.useEndDate ? `~ ${item.useEndDate}` : '종료일 미정'}</small>
                      </td>
                      <td>
                        {adminStatusLabels[item.status]}
                        <small>
                          {item.payStatus === 'CONFIRMED'
                            ? '입금 확인'
                            : item.payStatus === 'REFUNDED'
                              ? '환불'
                              : '입금 전'}
                        </small>
                      </td>
                      <td>{item.totalPrice.toLocaleString('ko-KR')}원</td>
                      <td>
                        {item.pendingNotificationCount > 0 ? (
                          <span className="admin-count">{item.pendingNotificationCount}건</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result?.items.length && <p className="admin-empty">해당하는 주문이 없어요.</p>}
            <div className="admin-pagination">
              <button
                className="admin-secondary"
                disabled={page === 0}
                onClick={() => setFilters((current) => ({ ...current, page: page - 1 }))}
              >
                이전
              </button>
              <span>
                {result?.totalElements ?? 0}건 · {page + 1} / {Math.max(1, result?.totalPages ?? 0)}
              </span>
              <button
                className="admin-secondary"
                disabled={!result || page + 1 >= result.totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: page + 1 }))}
              >
                다음
              </button>
            </div>
          </>
        )
      )}
    </section>
  )
}
