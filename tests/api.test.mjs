import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Vite의 환경변수 치환만 재현하고 실제 API.js의 공개 함수를 호출합니다.
async function client(env) {
  const source = (await readFile(new URL('../src/services/API.js', import.meta.url), 'utf8'))
    .replaceAll('import.meta.env', JSON.stringify(env))
    .replace(
      "'./mockup.js'",
      JSON.stringify(new URL('../src/services/mockup.js', import.meta.url).href),
    )
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('목업: API 15개로 작성·업로드·제출·조회·요구사항 흐름을 처리한다', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => {
    throw new Error('목업에서 네트워크를 호출하면 안 됩니다.')
  }
  try {
    const api = await client({ VITE_USE_BACKEND: 'false' })
    const config = await api.getOrderConfig()
    const templates = await api.getTemplates('COUPLE')
    const template = await api.getTemplate(templates[0].templateId)
    assert.equal(template.documents[0].minPhotos, 1)
    const { draftId, draftToken: token } = await api.createDraft()
    await api.updateDraft(
      draftId,
      { templateId: template.templateId, anniversaryType: 'COUPLE', validateStep: 1 },
      token,
    )
    await api.updateDraft(
      draftId,
      {
        customerName: '연동 테스트',
        phone: '010-1234-5678',
        useStartDate: config.minUseStartDate,
        validateStep: 2,
      },
      token,
    )
    assert.equal((await api.getDraft(draftId, token)).phone, '01012345678')
    await assert.rejects(
      api.updateDraft(draftId, { mainText: '저장되면 안 되는 문구', validateStep: 3 }, token),
      (error) => error.code === 'VALIDATION_FAILED',
    )
    assert.equal((await api.getDraft(draftId, token)).mainText, null)
    const file = new File(['photo'], 'test.png', { type: 'image/png' })
    const media = await api.uploadMedia(
      draftId,
      { file, type: 'PHOTO', documentNo: 1, slot: 1 },
      token,
    )
    assert.equal(
      (await api.updateMedia(draftId, media.mediaId, { caption: '우리의 사진' }, token)).caption,
      '우리의 사진',
    )
    const second = await api.uploadMedia(
      draftId,
      { file, type: 'PHOTO', documentNo: 1, slot: 2 },
      token,
    )
    assert.equal(await api.deleteMedia(draftId, media.mediaId, token), undefined)
    assert.equal((await api.getDraft(draftId, token)).documents[0].photos[0].slot, 2)
    const phrase = await api.generateAiPhrase(
      draftId,
      { target: 'MAIN_TEXT', inputText: '첫 기념일' },
      token,
    )
    await api.updateDraft(draftId, { mainText: phrase.text, validateStep: 3 }, token)
    const order = await api.submitOrder(draftId, token)
    assert.equal(order.status, 'SUBMITTED')
    assert.equal((await api.submitOrder(draftId, token)).orderNo, order.orderNo)
    assert.equal((await api.getOrder(draftId, token)).orderId, draftId)
    await assert.rejects(
      api.deleteMedia(draftId, second.mediaId, token),
      (error) => error.code === 'ALREADY_SUBMITTED',
    )
    await api.createOrderRequest(
      draftId,
      { content: '사진 순서를 바꿔 주세요.', requestType: 'REVISION' },
      token,
    )
    assert.equal((await api.getOrderRequests(draftId, token))[0].requestType, 'REVISION')
    const matches = await api.lookupDrafts('연동 테스트', '010-1234-5678')
    assert.equal(matches[0].draftId, draftId)
    await assert.rejects(
      api.getDraft(draftId, token),
      (error) => error.code === 'INVALID_DRAFT_TOKEN',
    )
    assert.equal((await api.getDraft(draftId, matches[0].draftToken)).status, 'SUBMITTED')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('실제 요청: URL, Bearer 토큰, JSON, multipart, 204, 서버 오류 정보를 보존한다', async () => {
  const originalFetch = globalThis.fetch
  let request
  let response = new Response(JSON.stringify({ success: true, data: { draftId: 7 } }))
  globalThis.fetch = async (url, options) => {
    request = { url, ...options }
    return response.clone()
  }
  try {
    const api = await client({
      VITE_USE_BACKEND: 'true',
      VITE_API_URL: 'https://backend.example/api/v1/',
    })
    await api.updateDraft(7, { phone: '010-1234-5678', subText: null }, 'token')
    assert.equal(request.url, 'https://backend.example/api/v1/drafts/7')
    assert.equal(request.headers.Authorization, 'Bearer token')
    assert.deepEqual(JSON.parse(request.body), { phone: '01012345678', subText: null })
    await api.uploadMedia(
      7,
      {
        file: new File(['photo'], 'a.png', { type: 'image/png' }),
        type: 'PHOTO',
        documentNo: 1,
        slot: 1,
      },
      'token',
    )
    assert.ok(request.body instanceof FormData)
    assert.equal(request.headers['Content-Type'], undefined)
    response = new Response(null, { status: 204 })
    assert.equal(await api.deleteMedia(7, 1, 'token'), undefined)
    response = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'DRAFT_INCOMPLETE',
          message: '필수값 누락',
          details: [{ field: 'mainText', value: 3 }],
        },
      }),
      { status: 400 },
    )
    await assert.rejects(
      api.submitOrder(7, 'token'),
      (error) =>
        error instanceof api.ApiError &&
        error.status === 400 &&
        error.code === 'DRAFT_INCOMPLETE' &&
        error.details[0].value === 3,
    )
    const unconfigured = await client({ VITE_USE_BACKEND: 'true' })
    await assert.rejects(unconfigured.getOrderConfig(), /VITE_API_URL/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
