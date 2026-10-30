import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
after(() => server.close())
const { default: Calendar } = await server.ssrLoadModule('/src/components/Calendar.tsx')
const mock = await server.ssrLoadModule('/src/services/mockup.js')

test('잘못된 날짜로 달력을 열어도 NaN 없이 날짜를 표시한다', () => {
  const html = renderToStaticMarkup(createElement(Calendar, {
    value: { start: '11/6/2026', end: '' }, minDateValue: 'invalid', onChange() {},
  }))
  assert.ok(!html.includes('NaN'))
  assert.match(html, /data-date="\d{4}-\d{2}-\d{2}"/)
})

test('목업 날짜는 브라우저 지역별 날짜 문자열에 의존하지 않는다', async () => {
  const original = Date.prototype.toLocaleDateString
  Date.prototype.toLocaleDateString = () => '11/6/2026'
  try {
    const config = await mock.mockRequest('/order-config')
    assert.match(config.minUseStartDate, /^\d{4}-\d{2}-\d{2}$/)
  } finally {
    Date.prototype.toLocaleDateString = original
  }
})
