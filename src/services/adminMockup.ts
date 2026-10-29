import { AdminApiError } from '../types/admin'
import type {
  AdminAccount,
  AdminDetail,
  AdminOrder,
  AdminOrderStatus,
  AdminPageResult,
  AdminSchedule,
  NotificationStatus,
} from '../types/admin'
export type { AdminOrder } from '../types/admin'

// 관리자 API와 같은 상태 전이·충돌 규칙을 재현하는 메모리 목업입니다.
export const adminStatusLabels: Record<AdminOrderStatus, string> = {
  DRAFT: '작성 중',
  SUBMITTED: '입금 대기',
  IN_PROGRESS: '제작중',
  DELIVERED: '완료',
  CANCELED: '취소',
}
export const anniversaryLabels: Record<string, string> = {
  COUPLE: '연애 기념일',
  BIRTHDAY: '생일',
  WEDDING: '결혼 기념일',
  ETC: '기타',
}

export function koreaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function calendarDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function createAdminSamples(today: string): AdminOrder[] {
  const [year, month] = today.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const entries = [
    { day: 7, name: '한지우', status: 'DELIVERED', anniversary: '연애 기념일' },
    { day: 14, name: '윤서아', status: 'DELIVERED', anniversary: '결혼 기념일' },
    { day: 17, name: '김도윤', status: 'IN_PROGRESS', anniversary: '연애 기념일' },
    { day: 19, name: '이서윤', status: 'DELIVERED', anniversary: '생일' },
    { day: 24, name: '박하준', status: 'SUBMITTED', anniversary: '생일' },
    { day: 24, name: '정지민', status: 'IN_PROGRESS', anniversary: '연애 기념일' },
    { day: 30, name: '송지호', status: 'IN_PROGRESS', anniversary: '결혼 기념일' },
  ] as const
  return entries.map((entry, index) => ({
    orderId: index + 1,
    orderNo: `DEMO-${String(index + 1).padStart(4, '0')}`,
    customerName: entry.name,
    anniversaryType:
      entry.anniversary === '생일'
        ? 'BIRTHDAY'
        : entry.anniversary === '결혼 기념일'
          ? 'WEDDING'
          : 'COUPLE',
    templateName: '크리스마스',
    dueDate: calendarDate(year, month - 1, Math.min(entry.day, lastDay)),
    status: entry.status,
    useStartDate: calendarDate(year, month - 1, Math.min(entry.day, lastDay)),
    useEndDate: index % 2 ? null : calendarDate(year, month - 1, Math.min(entry.day + 6, lastDay)),
    payStatus: entry.status === 'SUBMITTED' ? 'PENDING' : 'CONFIRMED',
    phone: '01000000000',
    totalPrice: 30000,
    submittedAt: new Date().toISOString(),
    pendingNotificationCount: 1,
  }))
}

export function ordersThisWeek<T extends Pick<AdminSchedule, 'orderId' | 'dueDate'>>(
  orders: T[],
  today: string,
) {
  const date = new Date(`${today}T00:00:00Z`)
  const start = new Date(date)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return orders
    .filter(
      (order) =>
        order.dueDate >= start.toISOString().slice(0, 10) &&
        order.dueDate <= end.toISOString().slice(0, 10),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.orderId - b.orderId)
}

const clone = <T>(value: T): T => structuredClone(value)
const timestamp = () => new Date().toISOString()
const accounts: AdminAccount[] = [
  {
    id: 1,
    email: 'admin@urluv.local',
    name: '관리자',
    active: true,
    lastLoginAt: null,
    createdAt: timestamp(),
  },
]
const passwords = new Map([[1, 'demo-password']])
const sessions = new Map<string, number>()
let currentAdminId = 1
const loginFailures = new Map<string, number[]>()
const ipFailures: number[] = []
let sequence = 100
const samples = createAdminSamples(koreaToday())
const details = new Map<number, AdminDetail>(
  samples.map((sample) => [
    sample.orderId,
    {
      order: {
        orderId: sample.orderId,
        orderNo: sample.orderNo,
        status: sample.status,
        payStatus: sample.payStatus,
        version: 0,
        totalPrice: sample.totalPrice,
        depositorName: sample.customerName,
        paidAt: sample.payStatus === 'CONFIRMED' ? timestamp() : null,
        siteUrl: null,
        adminMemo: null,
        submittedAt: sample.submittedAt,
        deliveredAt: sample.status === 'DELIVERED' ? timestamp() : null,
      },
      content: {
        draftId: sample.orderId,
        orderNo: sample.orderNo,
        status: sample.status,
        currentStep: 4,
        template: { templateId: 1, name: sample.templateName },
        anniversaryType: sample.anniversaryType,
        anniversaryEtcText: null,
        customerName: sample.customerName,
        phone: sample.phone,
        useStartDate: sample.useStartDate,
        useEndDate: sample.useEndDate,
        mainText: '함께라서 더 빛나는 오늘',
        subText: '너와 함께하는 모든 순간이 선물이야',
        documents: [{ documentNo: 1, photos: [], videos: [] }],
        updatedAt: timestamp(),
      },
      requests:
        sample.orderId === 3
          ? [
              {
                requestId: 1,
                requestType: 'REVISION',
                content: '사진 순서를 바꿔 주세요.',
                status: 'REQUESTED',
                adminReply: null,
                requestedAt: timestamp(),
                doneAt: null,
              },
            ]
          : [],
      notifications: [
        {
          notificationId: sample.orderId,
          orderId: sample.orderId,
          orderNo: sample.orderNo,
          customerName: sample.customerName,
          type: 'SUBMITTED',
          phone: sample.phone,
          content: `[URLUV] 주문이 접수되었어요. (${sample.orderNo})\n입금 계좌: 국민 000000000000\n입금 금액: 30,000원`,
          sendStatus: 'PENDING',
          sentAt: null,
          createdAt: timestamp(),
        },
      ],
      auditLogs: [],
    },
  ]),
)
function fail(status: number, code: string, message: string, field?: string): never {
  throw new AdminApiError(message, status, code, field ? [{ field, reason: 'INVALID' }] : [])
}
function detailOf(id: number) {
  const detail = details.get(id)
  if (!detail) fail(404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없어요.')
  return detail
}
function addLog(
  detail: AdminDetail,
  action: string,
  fromValue: string,
  toValue: string,
  note: string | null,
) {
  detail.auditLogs.unshift({
    id: sequence++,
    adminName: accounts.find((item) => item.id === currentAdminId)?.name ?? '관리자',
    action,
    fromValue,
    toValue,
    note,
    createdAt: timestamp(),
  })
}
function addNotification(detail: AdminDetail, type: string) {
  detail.notifications.unshift({
    notificationId: sequence++,
    orderId: detail.order.orderId,
    orderNo: detail.order.orderNo,
    customerName: detail.content.customerName ?? '',
    phone: detail.content.phone ?? '',
    type,
    content:
      type === 'PAID'
        ? `[URLUV] 입금이 확인되었어요. (${detail.order.orderNo})\n제작을 시작할게요.`
        : `[URLUV] 제작이 완료되었어요! (${detail.order.orderNo})\n완성된 사이트: ${detail.order.siteUrl}\n사용 기간: ${detail.content.useStartDate} ~ ${detail.content.useEndDate ?? '종료일 미정'}`,
    sendStatus: 'PENDING',
    sentAt: null,
    createdAt: timestamp(),
  })
}
function summaryOf(detail: AdminDetail): AdminOrder {
  const content = detail.content
  return {
    orderId: detail.order.orderId,
    orderNo: detail.order.orderNo,
    status: detail.order.status,
    payStatus: detail.order.payStatus,
    customerName: content.customerName ?? '',
    phone: content.phone ?? '',
    templateName: content.template?.name ?? '',
    anniversaryType: content.anniversaryType ?? '',
    dueDate: content.useStartDate ?? '',
    useStartDate: content.useStartDate ?? '',
    useEndDate: content.useEndDate,
    totalPrice: detail.order.totalPrice,
    submittedAt: detail.order.submittedAt,
    pendingNotificationCount: detail.notifications.filter((item) => item.sendStatus === 'PENDING')
      .length,
  }
}
function paginate<T>(items: T[], params: URLSearchParams): AdminPageResult<T> {
  const page = Number(params.get('page') ?? 0),
    size = Number(params.get('size') ?? 20)
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100)
    fail(400, 'VALIDATION_FAILED', '페이지 범위를 확인해 주세요.')
  return {
    items: items.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  }
}
function checkedPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 72)
    fail(400, 'VALIDATION_FAILED', '비밀번호는 10~72자로 입력해 주세요.', 'password')
}

export async function adminMockRequest(
  path: string,
  method: string,
  rawBody?: unknown,
  token?: string,
): Promise<unknown> {
  const [pathname, search] = path.split('?')
  const params = new URLSearchParams(search)
  const parts = pathname.split('/').filter(Boolean)
  const body = (rawBody ?? {}) as Record<string, unknown>
  if (pathname === '/auth/login' && method === 'POST') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    if (!email || typeof body.password !== 'string' || !body.password)
      fail(400, 'VALIDATION_FAILED', '이메일과 비밀번호를 입력해 주세요.')
    const now = Date.now(),
      cutoff = now - 600000
    const failures = (loginFailures.get(email) ?? []).filter((time) => time > cutoff)
    while (ipFailures.length && ipFailures[0] <= cutoff) ipFailures.shift()
    if (failures.length >= 5 || ipFailures.length >= 20)
      fail(429, 'TOO_MANY_REQUESTS', '로그인 시도가 많아요. 10분 뒤 다시 시도해 주세요.')
    const account = accounts.find((item) => item.email === email && item.active)
    if (!account || passwords.get(account.id) !== body.password) {
      failures.push(now)
      loginFailures.set(email, failures)
      ipFailures.push(now)
      fail(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호를 확인해 주세요.')
    }
    loginFailures.delete(email)
    account.lastLoginAt = timestamp()
    const accessToken = `mock-admin-${crypto.randomUUID()}`
    sessions.set(accessToken, account.id)
    return clone({
      accessToken,
      expiresAt: new Date(Date.now() + 7200000).toISOString(),
      admin: account,
    })
  }
  const authenticatedId = token ? sessions.get(token) : undefined
  const currentAdmin = accounts.find((item) => item.id === authenticatedId && item.active)
  if (!currentAdmin)
    fail(401, 'ADMIN_UNAUTHORIZED', '로그인 정보가 유효하지 않아요. 다시 로그인해 주세요.')
  currentAdminId = currentAdmin.id
  if (pathname === '/me' && method === 'GET') return clone(currentAdmin)
  if (pathname === '/me/password' && method === 'PUT') {
    if (body.currentPassword !== passwords.get(currentAdmin.id))
      fail(400, 'WRONG_CURRENT_PASSWORD', '현재 비밀번호가 맞지 않아요.', 'currentPassword')
    checkedPassword(body.newPassword)
    passwords.set(currentAdmin.id, String(body.newPassword))
    return undefined
  }
  if (parts[0] === 'accounts') {
    if (method === 'GET') return clone(accounts)
    if (method === 'POST') {
      const email = String(body.email ?? '').toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail(400, 'VALIDATION_FAILED', '이메일 형식을 확인해 주세요.', 'email')
      if (!String(body.name ?? '').trim() || String(body.name).length > 50)
        fail(400, 'VALIDATION_FAILED', '이름은 1~50자로 입력해 주세요.', 'name')
      checkedPassword(body.password)
      if (accounts.some((item) => item.email === email))
        fail(409, 'EMAIL_ALREADY_USED', '이미 사용 중인 이메일이에요.', 'email')
      const account: AdminAccount = {
        id: sequence++,
        email,
        name: String(body.name).trim(),
        active: true,
        lastLoginAt: null,
        createdAt: timestamp(),
      }
      accounts.push(account)
      passwords.set(account.id, String(body.password))
      return clone(account)
    }
    if (method === 'PATCH') {
      const account = accounts.find((item) => item.id === Number(parts[1]))
      if (!account) fail(404, 'ADMIN_NOT_FOUND', '운영자를 찾을 수 없어요.')
      if (typeof body.active !== 'boolean')
        fail(400, 'VALIDATION_FAILED', '활성 상태를 확인해 주세요.')
      if (
        !body.active &&
        (account.id === currentAdmin.id || accounts.filter((item) => item.active).length === 1)
      )
        fail(409, 'LAST_ADMIN', '본인 또는 마지막 활성 운영자는 정지할 수 없어요.')
      account.active = body.active
      return clone(account)
    }
  }
  if (pathname === '/schedule') {
    const from = params.get('from') ?? '',
      to = params.get('to') ?? ''
    const validDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    if (!validDate(from) || !validDate(to))
      fail(400, 'VALIDATION_FAILED', '날짜 형식을 확인해 주세요.')
    if (to < from || (Date.parse(to) - Date.parse(from)) / 86400000 + 1 > 366)
      fail(400, 'INVALID_DATE_RANGE', '조회 기간은 최대 366일이에요.')
    return clone(
      [...details.values()]
        .map(summaryOf)
        .filter(
          (item) =>
            item.status !== 'DRAFT' &&
            (params.get('includeCanceled') === 'true' || item.status !== 'CANCELED') &&
            item.useStartDate <= to &&
            (item.useEndDate ?? item.useStartDate) >= from,
        )
        .sort((a, b) => a.useStartDate.localeCompare(b.useStartDate)),
    )
  }
  if (pathname === '/orders' && method === 'GET') {
    const status = params.get('status'),
      payStatus = params.get('payStatus'),
      keyword = (params.get('keyword') ?? '').toLowerCase()
    if (status && !(status in adminStatusLabels))
      fail(400, 'VALIDATION_FAILED', '주문 상태를 확인해 주세요.', 'status')
    if (payStatus && !['PENDING', 'CONFIRMED', 'REFUNDED'].includes(payStatus))
      fail(400, 'VALIDATION_FAILED', '입금 상태를 확인해 주세요.', 'payStatus')
    const digits = keyword.replace(/\D/g, '')
    const items = [...details.values()]
      .map(summaryOf)
      .filter(
        (item) =>
          (status ? item.status === status : item.status !== 'DRAFT') &&
          (!payStatus || item.payStatus === payStatus) &&
          (!keyword ||
            item.orderNo.toLowerCase().includes(keyword) ||
            item.customerName.toLowerCase().includes(keyword) ||
            (digits.length >= 3 && item.phone.includes(digits))),
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.orderId - a.orderId)
    return clone(paginate(items, params))
  }
  if (parts[0] === 'orders' && parts[1]) {
    const detail = detailOf(Number(parts[1]))
    if (method === 'GET') return clone(detail)
    if (!Number.isInteger(body.expectedVersion))
      fail(400, 'VALIDATION_FAILED', '주문 버전이 필요해요.', 'expectedVersion')
    if (body.expectedVersion !== detail.order.version)
      fail(
        409,
        'ORDER_CONFLICT',
        '다른 운영자가 먼저 주문을 바꿨어요. 상세를 새로 불러왔으니 확인해 주세요.',
      )
    if (body.note != null && (typeof body.note !== 'string' || body.note.length > 500))
      fail(400, 'VALIDATION_FAILED', '메모는 500자 이내로 입력해 주세요.', 'note')
    if (parts[2] === 'payment' && parts[3] === 'confirm') {
      if (detail.order.status !== 'SUBMITTED' || detail.order.payStatus !== 'PENDING')
        fail(409, 'INVALID_ORDER_STATE', '입금 대기 중인 제출 주문만 입금 확인할 수 있어요.')
      detail.order.status = 'IN_PROGRESS'
      detail.order.payStatus = 'CONFIRMED'
      detail.order.paidAt = timestamp()
      addLog(
        detail,
        'PAYMENT_CONFIRM',
        'PENDING',
        'CONFIRMED',
        body.note ? String(body.note) : null,
      )
      addNotification(detail, 'PAID')
    } else if (parts[2] === 'status') {
      const previous = detail.order.status
      if (body.status === 'DELIVERED') {
        if (previous !== 'IN_PROGRESS')
          fail(409, 'INVALID_ORDER_STATE', '제작 중인 주문만 납품할 수 있어요.')
        if (
          typeof body.siteUrl !== 'string' ||
          body.siteUrl.length > 500 ||
          !/^https?:\/\//.test(body.siteUrl)
        )
          fail(
            400,
            'VALIDATION_FAILED',
            'http 또는 https로 시작하는 완성 링크가 필요해요.',
            'siteUrl',
          )
        try {
          new URL(body.siteUrl)
        } catch {
          fail(400, 'VALIDATION_FAILED', '완성 링크를 확인해 주세요.', 'siteUrl')
        }
        detail.order.siteUrl = body.siteUrl
        detail.order.deliveredAt = timestamp()
        detail.order.status = 'DELIVERED'
        addNotification(detail, 'DELIVERED')
      } else if (body.status === 'CANCELED') {
        if (!['SUBMITTED', 'IN_PROGRESS'].includes(previous))
          fail(409, 'INVALID_ORDER_STATE', '이미 종료되었거나 작성 중인 주문은 취소할 수 없어요.')
        detail.order.status = 'CANCELED'
      } else fail(409, 'INVALID_ORDER_STATE', '납품 또는 취소만 직접 변경할 수 있어요.')
      addLog(
        detail,
        'STATUS_CHANGE',
        previous,
        detail.order.status,
        body.note ? String(body.note) : null,
      )
    } else fail(404, 'NOT_FOUND', '관리자 API 경로를 찾을 수 없어요.')
    detail.order.version++
    detail.content.status = detail.order.status
    detail.content.updatedAt = timestamp()
    return clone(detail)
  }
  if (parts[0] === 'notifications') {
    const all = [...details.values()]
      .flatMap((item) => item.notifications)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.notificationId - a.notificationId)
    const state = params.get('sendStatus')
    if (state && !['PENDING', 'SENT', 'FAILED'].includes(state))
      fail(400, 'VALIDATION_FAILED', '발송 상태를 확인해 주세요.')
    if (method === 'GET')
      return clone(
        paginate(
          all.filter((item) => !state || item.sendStatus === state),
          params,
        ),
      )
    const notification = all.find((item) => item.notificationId === Number(parts[1]))
    if (!notification) fail(404, 'NOTIFICATION_NOT_FOUND', '문자를 찾을 수 없어요.')
    if (!['PENDING', 'SENT', 'FAILED'].includes(String(body.sendStatus)))
      fail(400, 'VALIDATION_FAILED', '발송 상태를 확인해 주세요.')
    if (notification.sendStatus !== body.sendStatus) {
      addLog(
        detailOf(notification.orderId),
        'NOTIFICATION_STATUS',
        notification.sendStatus,
        String(body.sendStatus),
        notification.type,
      )
      notification.sendStatus = body.sendStatus as NotificationStatus
      notification.sentAt = body.sendStatus === 'SENT' ? timestamp() : null
    }
    return clone(notification)
  }
  fail(404, 'NOT_FOUND', '관리자 API 경로를 찾을 수 없어요.')
}
