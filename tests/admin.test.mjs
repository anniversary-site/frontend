import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
after(() => server.close())
const model = await server.ssrLoadModule('/src/services/adminMockup.ts')

test('관리자 샘플은 월 길이에 맞는 날짜와 독립적인 주문번호를 사용한다', () => {
  const samples = model.createAdminSamples('2026-02-15')
  assert.equal(samples.length, 7)
  assert.ok(samples.every((order) => order.dueDate.startsWith('2026-02-')))
  assert.ok(samples.every((order) => Number(order.dueDate.slice(-2)) <= 28))
  assert.ok(samples.every((order) => order.orderNo.startsWith('DEMO-')))
  assert.equal(samples.filter((order) => order.dueDate === '2026-02-24').length, 2)
})

test('이번 주 일정은 월·연도를 넘어도 일요일부터 토요일까지 포함한다', () => {
  const orders = ['2025-12-27', '2025-12-28', '2025-12-31', '2026-01-03', '2026-01-04'].map(
    (dueDate, index) => ({ orderId: index, dueDate }),
  )
  assert.deepEqual(
    model.ordersThisWeek(orders, '2026-01-01').map((order) => order.dueDate),
    ['2025-12-28', '2025-12-31', '2026-01-03'],
  )
})

test('/admin 화면은 주문 API와 인증 정보 없이 달력·샘플 일정을 표시한다', async () => {
  const { default: AdminCalendar } = await server.ssrLoadModule(
    '/src/pages/admin/AdminCalendar.tsx',
  )
  const samples = model.createAdminSamples('2026-10-17')
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(AdminCalendar, {
        today: '2026-10-17',
        month: '2026-10',
        orders: samples,
        weekOrders: samples,
        loading: false,
        onMonthChange() {},
        onSelect() {},
      }),
    ),
  )
  assert.ok(html.includes('마감 일정'))
  assert.ok(html.includes('이전 달') && html.includes('다음 달'))
  assert.ok((html.match(/class="admin-order-chip/g) ?? []).length >= 7)
  assert.equal((html.match(/class="admin-calendar-cell/g) ?? []).length, 42)
  assert.ok(!html.includes('type="password"'))
})

test('로그인 전에는 운영자 로그인 화면만 렌더링한다', async () => {
  const { default: AdminRoute } = await server.ssrLoadModule('/src/pages/admin/AdminRoute.tsx')
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminRoute)))
  assert.ok(html.includes('운영자 로그인'))
  assert.ok(html.includes('type="email"') && html.includes('type="password"'))
  assert.ok(!html.includes('admin-calendar-grid'))
  assert.ok(!html.includes('김도윤'))
})
