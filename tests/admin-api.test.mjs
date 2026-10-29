import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  define: { 'import.meta.env.VITE_USE_ADMIN': '"false"' },
})
after(() => server.close())
const api = await server.ssrLoadModule('/src/services/AdminAPI.js')
const { koreaToday } = await server.ssrLoadModule('/src/services/adminMockup.ts')
const savedStorage = globalThis.sessionStorage
const memoryStorage = new Map()
globalThis.sessionStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, value),
  removeItem: (key) => memoryStorage.delete(key),
}
after(() => {
  if (savedStorage === undefined) delete globalThis.sessionStorage
  else globalThis.sessionStorage = savedStorage
})
await api.loginAdmin('admin@urluv.local', 'demo-password')

test('관리자 API: 검색·기간 겹침·페이지 범위를 명세대로 처리한다', async () => {
  const page = await api.getAdminOrders({ size: 2 })
  assert.equal(page.items.length, 2)
  assert.equal(page.totalElements, 7)
  assert.equal(page.totalPages, 4)
  const result = await api.getAdminOrders({
    keyword: '박하준',
    status: 'SUBMITTED',
    payStatus: 'PENDING',
  })
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].customerName, '박하준')
  const month = koreaToday().slice(0, 7)
  const overlap = await api.getAdminSchedule(`${month}-08`, `${month}-08`)
  assert.ok(overlap.some((item) => item.customerName === '한지우'))
  assert.ok(!overlap.some((item) => item.customerName === '윤서아'))
  await assert.rejects(
    api.getAdminSchedule('2026-01-02', '2026-01-01'),
    (error) => error.code === 'INVALID_DATE_RANGE',
  )
  await assert.rejects(
    api.getAdminOrders({ size: 101 }),
    (error) => error.code === 'VALIDATION_FAILED',
  )
})

test('입금 확인·납품은 버전 충돌을 막고 문자·처리 기록을 만든다', async () => {
  const page = await api.getAdminOrders({ keyword: '박하준' })
  const id = page.items[0].orderId
  const before = await api.getAdminOrder(id)
  const results = await Promise.allSettled(
    Array.from({ length: 4 }, () => api.confirmAdminPayment(id, before.order.version, '입금 확인')),
  )
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.ok(
    results
      .filter((result) => result.status === 'rejected')
      .every((result) => result.reason.code === 'ORDER_CONFLICT'),
  )
  const paid = await api.getAdminOrder(id)
  assert.equal(paid.order.status, 'IN_PROGRESS')
  assert.equal(paid.order.payStatus, 'CONFIRMED')
  assert.equal(paid.order.version, before.order.version + 1)
  assert.equal(paid.notifications[0].type, 'PAID')
  assert.equal(paid.notifications[0].sendStatus, 'PENDING')
  await assert.rejects(
    api.changeAdminOrderStatus(id, { status: 'DELIVERED', expectedVersion: paid.order.version }),
    (error) => error.code === 'VALIDATION_FAILED',
  )
  assert.equal((await api.getAdminOrder(id)).order.version, paid.order.version)
  const delivered = await api.changeAdminOrderStatus(id, {
    status: 'DELIVERED',
    expectedVersion: paid.order.version,
    siteUrl: 'https://example.com/anniversary',
  })
  assert.equal(delivered.order.status, 'DELIVERED')
  assert.equal(delivered.notifications[0].type, 'DELIVERED')
  assert.equal(delivered.auditLogs[0].action, 'STATUS_CHANGE')
  await assert.rejects(
    api.changeAdminOrderStatus(id, {
      status: 'CANCELED',
      expectedVersion: delivered.order.version,
    }),
    (error) => error.code === 'INVALID_ORDER_STATE',
  )
})

test('문자 상태는 되돌릴 수 있고 동일 상태 요청은 처리 기록을 늘리지 않는다', async () => {
  const page = await api.getAdminNotifications({ sendStatus: 'PENDING', size: 100 })
  const item = page.items[0]
  const sent = await api.updateAdminNotification(item.notificationId, 'SENT')
  assert.ok(sent.sentAt)
  const count = (await api.getAdminOrder(item.orderId)).auditLogs.length
  await api.updateAdminNotification(item.notificationId, 'SENT')
  assert.equal((await api.getAdminOrder(item.orderId)).auditLogs.length, count)
  const pending = await api.updateAdminNotification(item.notificationId, 'PENDING')
  assert.equal(pending.sentAt, null)
})

test('취소는 입금 상태를 유지하며 운영자 추가·정지 규칙을 적용한다', async () => {
  const list = await api.getAdminOrders({ keyword: '정지민' })
  const detail = await api.getAdminOrder(list.items[0].orderId)
  const canceled = await api.changeAdminOrderStatus(detail.order.orderId, {
    status: 'CANCELED',
    expectedVersion: detail.order.version,
  })
  assert.equal(canceled.order.payStatus, 'CONFIRMED')
  const month = koreaToday().slice(0, 7)
  assert.ok(
    !(await api.getAdminSchedule(`${month}-01`, `${month}-28`)).some(
      (item) => item.orderId === canceled.order.orderId,
    ),
  )
  assert.ok(
    (await api.getAdminSchedule(`${month}-01`, `${month}-28`, true)).some(
      (item) => item.orderId === canceled.order.orderId,
    ),
  )
  assert.equal((await api.getAdminMe()).id, 1)
  const account = await api.createAdminAccount({
    email: 'TEST@EXAMPLE.COM',
    name: '테스트 운영자',
    password: 'test-password',
  })
  assert.equal(account.email, 'test@example.com')
  assert.equal((await api.updateAdminAccount(account.id, false)).active, false)
  await assert.rejects(api.updateAdminAccount(1, false), (error) => error.code === 'LAST_ADMIN')
  await assert.rejects(
    api.createAdminAccount({ email: account.email, name: '중복', password: 'test-password' }),
    (error) => error.code === 'EMAIL_ALREADY_USED',
  )
  const session = await api.loginAdmin('admin@urluv.local', 'demo-password')
  assert.ok(session.accessToken)
  await api.changeAdminPassword('demo-password', 'updated-password')
  assert.ok((await api.getAdminAccounts()).length >= 2)
})

test('관리자 로그인·만료·로그아웃·정지된 계정의 기존 토큰을 검증한다', async () => {
  await assert.rejects(
    api.loginAdmin('admin@urluv.local', 'wrong-password'),
    (error) => error.code === 'INVALID_CREDENTIALS',
  )
  const session = await api.loginAdmin('ADMIN@URLUV.LOCAL', 'updated-password')
  assert.equal(api.getAdminSession().admin.id, 1)
  memoryStorage.set(
    'urluv-admin-session-mock',
    JSON.stringify({ ...session, expiresAt: '2000-01-01T00:00:00Z' }),
  )
  await assert.rejects(api.getAdminMe(), (error) => error.code === 'ADMIN_UNAUTHORIZED')
  assert.equal(api.getAdminSession(), null)
  await api.loginAdmin('admin@urluv.local', 'updated-password')
  const account = (await api.getAdminAccounts()).find((item) => item.email === 'test@example.com')
  await api.updateAdminAccount(account.id, true)
  const otherSession = await api.loginAdmin('test@example.com', 'test-password')
  await api.loginAdmin('admin@urluv.local', 'updated-password')
  await api.updateAdminAccount(account.id, false)
  memoryStorage.set('urluv-admin-session-mock', JSON.stringify(otherSession))
  await assert.rejects(api.getAdminMe(), (error) => error.code === 'ADMIN_UNAUTHORIZED')
  await api.loginAdmin('admin@urluv.local', 'updated-password')
  api.clearAdminSession()
  await assert.rejects(api.getAdminMe(), (error) => error.code === 'ADMIN_UNAUTHORIZED')
})

test('같은 이메일로 5회 로그인에 실패하면 목업도 재시도를 제한한다', async () => {
  for (let i = 0; i < 5; i++) {
    await assert.rejects(
      api.loginAdmin('missing@example.com', 'wrong-password'),
      (error) => error.code === 'INVALID_CREDENTIALS',
    )
  }
  await assert.rejects(
    api.loginAdmin('missing@example.com', 'anything'),
    (error) => error.code === 'TOO_MANY_REQUESTS' && error.status === 429,
  )
})

test('실제 관리자 API는 별도 주소·관리자 토큰·버전·204·401을 처리한다', async () => {
  const remote = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    define: {
      'import.meta.env.VITE_USE_ADMIN': '"true"',
      'import.meta.env.VITE_ADMIN_BACK_URL': '"https://admin.example/api/admin/v1/"',
    },
  })
  const originalFetch = globalThis.fetch,
    originalStorage = globalThis.sessionStorage
  const storage = new Map()
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  let captured,
    response = new Response(
      JSON.stringify({
        success: true,
        data: {
          accessToken: 'admin-token',
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          admin: { id: 1 },
        },
      }),
    )
  globalThis.fetch = async (url, options) => {
    captured = { url, ...options }
    return response.clone()
  }
  try {
    const client = await remote.ssrLoadModule('/src/services/AdminAPI.js')
    await assert.rejects(client.getAdminMe(), (error) => error.code === 'ADMIN_UNAUTHORIZED')
    await client.loginAdmin('test@example.com', 'test-password')
    assert.equal(captured.url, 'https://admin.example/api/admin/v1/auth/login')
    assert.equal(captured.headers.Authorization, undefined)
    response = new Response(JSON.stringify({ success: true, data: {} }))
    await client.confirmAdminPayment(1, 3, '메모')
    assert.equal(captured.headers.Authorization, 'Bearer admin-token')
    assert.equal(captured.url, 'https://admin.example/api/admin/v1/orders/1/payment/confirm')
    assert.deepEqual(JSON.parse(captured.body), { expectedVersion: 3, note: '메모' })
    response = new Response(null, { status: 204 })
    assert.equal(await client.changeAdminPassword('before-password', 'after-password'), undefined)
    response = new Response(
      JSON.stringify({ success: false, error: { code: 'ADMIN_UNAUTHORIZED', message: '만료됨' } }),
      { status: 401 },
    )
    await assert.rejects(client.getAdminMe(), (error) => error.code === 'ADMIN_UNAUTHORIZED')
    assert.equal(client.getAdminSession(), null)
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage === undefined) delete globalThis.sessionStorage
    else globalThis.sessionStorage = originalStorage
    await remote.close()
  }
})
