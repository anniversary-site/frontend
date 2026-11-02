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

test('목업: 새 API로 작성·업로드·제출·조회·요구사항 흐름을 처리한다', async () => {
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
        useEndDate: config.minUseStartDate,
        validateStep: 2,
      },
      token,
    )
    assert.equal((await api.getDraft(draftId, token)).phone, '01012345678')
    await assert.rejects(
      api.updateDraft(draftId, { memoryInput: '저장되면 안 되는 문구', validateStep: 3 }, token),
      (error) => error.code === 'VALIDATION_FAILED',
    )
    assert.equal((await api.getDraft(draftId, token)).memoryInput, null)
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
    const story = await api.generateAiStory(
      draftId,
      '우리는 봄에 처음 만났고 함께 산책하며 소중한 추억을 쌓았습니다.',
      token,
    )
    assert.equal(story.remainingCount, 9)
    assert.equal((await api.getDraft(draftId, token)).memoryStory, story.memoryStory)
    await api.updateDraft(
      draftId,
      {
        sitePassword: '1225',
        musics: [{ title: '노래', artist: '가수', album: '앨범' }],
        letters: [{ content: '편지\n내용' }],
        validateStep: 3,
      },
      token,
    )
    const saved = await api.getDraft(draftId, token)
    assert.equal(saved.sitePasswordSet, true)
    assert.equal(saved.sitePassword, undefined)
    await api.updateDraft(
      draftId,
      { memoryInput: '원문만 수정해도 생성된 이야기는 유지됩니다.' },
      token,
    )
    assert.equal((await api.getDraft(draftId, token)).memoryStory, story.memoryStory)
    await assert.rejects(
      api.updateDraft(
        draftId,
        {
          musics: [
            { title: '노래', artist: '가수', album: '앨범', youtubeUrl: 'https://evil.example' },
          ],
        },
        token,
      ),
      (error) => error.code === 'INVALID_YOUTUBE_URL',
    )
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
    await api.updateDraft(7, { phone: '010-1234-5678', memoryInput: null }, 'token')
    assert.equal(request.url, 'https://backend.example/api/v1/drafts/7')
    assert.equal(request.headers.Authorization, 'Bearer token')
    assert.deepEqual(JSON.parse(request.body), { phone: '01012345678', memoryInput: null })
    await api.generateAiStory(7, '함께한 추억', 'draft-token')
    assert.equal(request.url, 'https://backend.example/api/v1/drafts/7/ai-story')
    assert.deepEqual(JSON.parse(request.body), { memoryInput: '함께한 추억' })
    await api.unlockSite('a/b', 'secret')
    assert.equal(request.url, 'https://backend.example/api/v1/sites/a%2Fb/unlock')
    assert.equal(request.headers.Authorization, undefined)
    await api.getSite('demo', 'site-token')
    assert.equal(request.headers.Authorization, 'Bearer site-token')
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
          details: [{ field: 'memoryStory', value: 3 }],
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

test('완성 사이트는 비밀번호와 별도 사이트 토큰으로 접근한다', async () => {
  const api = await client({ VITE_USE_BACKEND: 'false' })
  await assert.rejects(
    api.getSite('demo', 'draft-token'),
    (error) => error.code === 'INVALID_SITE_TOKEN',
  )
  await assert.rejects(
    api.unlockSite('demo', 'wrong'),
    (error) => error.code === 'WRONG_SITE_PASSWORD',
  )
  const session = await api.unlockSite('demo', '1225')
  const site = await api.getSite('demo', session.siteAccessToken)
  assert.ok(site.memoryTitle)
  assert.equal(site.customerName, undefined)
  assert.equal(site.memoryInput, undefined)
  await assert.rejects(
    api.getSite('missing', session.siteAccessToken),
    (error) => error.code === 'SITE_NOT_FOUND',
  )
})
