import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
after(() => server.close())
const { validationErrorPage } = await server.ssrLoadModule('/src/utils/order.ts')
const { canResumeTab, readTabOrder, saveTabOrder, restoreTabFields } = await server.ssrLoadModule(
  '/src/services/tabOrder.ts',
)

test('새로고침과 뒤로가기에서만 현재 탭 복원을 허용한다', () => {
  assert.equal(canResumeTab('reload', 'POP', 'default'), true)
  assert.equal(canResumeTab('back_forward', 'POP', 'default'), true)
  assert.equal(canResumeTab('navigate', 'POP', 'previous-screen'), true)
  assert.equal(canResumeTab('navigate', 'POP', 'default'), false)
  assert.equal(canResumeTab('navigate', 'PUSH', 'new-screen'), false)
  assert.equal(canResumeTab('reload', 'PUSH', 'new-screen'), false)
  assert.equal(canResumeTab('back_forward', 'REPLACE', 'new-screen'), false)
})

test('탭 보관 데이터는 비밀번호를 제외하고 서버 상태를 유지하며 입력값을 복원한다', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  })
  try {
    const session = { draftId: 7, draftToken: 'test-token' }
    const data = {
      name: '테스트',
      date: '2026-11-30',
      endDate: '2026-12-05',
      template: 2,
      occasion: '생일',
      sitePassword: '1234',
      sitePasswordSet: false,
      price: { totalPrice: 1111 },
      musics: [{ title: '제목', artist: '가수' }],
      letterChoice: 'ORIGINAL',
      letterInput: '저장하지 않은 편지',
    }
    saveTabOrder('tab', session, data)
    const stored = readTabOrder('tab')
    assert.deepEqual(stored.session, session)
    assert.equal('sitePassword' in stored.data, false)
    assert.equal('sitePasswordSet' in stored.data, false)
    assert.equal('price' in stored.data, false)
    const current = {
      ...data,
      name: '서버 이름',
      sitePassword: '',
      sitePasswordSet: true,
      price: { totalPrice: 2111 },
      date: '2026-12-01',
    }
    const restored = restoreTabFields(current, stored.data)
    assert.equal(restored.name, data.name)
    assert.equal(restored.date, data.date)
    assert.equal(restored.endDate, data.endDate)
    assert.equal(restored.letterInput, data.letterInput)
    assert.equal(restored.sitePassword, '')
    assert.equal(restored.sitePasswordSet, true)
    assert.deepEqual(restored.price, current.price)
    assert.equal(restoreTabFields(current, { template: 1 }, [1, 2]).template, 1)
    assert.equal(restoreTabFields(current, { template: 99 }, [1, 2]).template, current.template)
    const invalid = restoreTabFields(current, {
      name: 123,
      template: 99,
      sitePassword: 'bad',
      sitePasswordSet: false,
      price: { totalPrice: 0 },
      occasion: 'invalid',
      letterChoice: 'invalid',
      musics: [null],
    })
    assert.deepEqual(invalid, current)
    storage.set('tab', '{')
    assert.equal(readTabOrder('tab'), null)
    storage.set('tab', JSON.stringify({ version: 1, session: { draftId: -1 }, data: {} }))
    assert.equal(readTabOrder('tab'), null)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor)
    else delete globalThis.sessionStorage
  }
})

test('글자 수·용량·횟수 제한값으로 주문 단계를 이동하지 않는다', () => {
  for (const code of ['TEXT_TOO_LONG', 'FILE_TOO_LARGE', 'AI_LIMIT_EXCEEDED', 'HTTP_ERROR']) {
    for (const value of [1, 2, 3, 50, 100, 2000]) {
      assert.equal(
        validationErrorPage({
          code,
          details: [{ field: 'sitePasswordHint', reason: 'MAX_LENGTH', value }],
        }),
        null,
      )
    }
  }
  assert.equal(
    validationErrorPage({
      code: 'VALIDATION_FAILED',
      details: [{ field: 'phone', reason: 'MAX_LENGTH', value: 2 }],
    }),
    null,
  )
})

test('필수값과 미디어 개수 검증의 단계 번호만 사용한다', () => {
  for (const [value, expected] of [
    [1, 'template'],
    [2, 'info'],
    [3, 'content'],
  ]) {
    assert.equal(
      validationErrorPage({
        code: 'VALIDATION_FAILED',
        details: [{ field: 'requiredField', reason: 'REQUIRED', value }],
      }),
      expected,
    )
  }
  for (const reason of ['MIN_PHOTOS', 'MIN_VIDEOS']) {
    assert.equal(
      validationErrorPage({
        code: 'VALIDATION_FAILED',
        details: [{ field: 'documents[1].photos', reason, value: 3 }],
      }),
      'content',
    )
  }
  for (const details of [
    [],
    [{ field: 'name', reason: 'REQUIRED' }],
    [{ field: 'name', reason: 'REQUIRED', value: 100 }],
  ]) {
    assert.equal(validationErrorPage({ code: 'VALIDATION_FAILED', details }), null)
  }
})
