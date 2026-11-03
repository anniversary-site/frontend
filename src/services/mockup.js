// 페이지 새로고침 시 초기화되는 메모리 목업입니다. 실제 서버 요청은 하지 않습니다.
const drafts = new Map()
const tokens = new Map()
const passwords = new Map()
const aiCounts = new Map()
const siteTokens = new Map()
const orders = new Map()
const requests = new Map()
let sequence = 1024
const copy = (value) => structuredClone(value)
const now = () => new Date().toISOString()
const dateAfter = (days) => {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const bankAccount = { bankName: '국민', accountNumber: '000000000000', accountHolder: 'URLUV' }
export const mockOrderConfig = {
  price: 30000,
  bankAccount,
  minLeadDays: 7,
  anniversaryTypes: [
    { code: 'COUPLE', label: '연애 기념일' },
    { code: 'BIRTHDAY', label: '생일' },
    { code: 'WEDDING', label: '결혼 기념일' },
    { code: 'ETC', label: '기타' },
  ],
  limits: {
    memoryInputMinLength: 20,
    memoryInputMaxLength: 2000,
    letterInputMinLength: 10,
    letterMaxLength: 2000,
    captionMaxLength: 50,
    videoTitleMaxLength: 30,
    photoMaxSizeMb: 10,
    videoMaxSizeMb: 70,
    videoMaxDurationSec: 60,
    photoTypes: ['image/jpeg', 'image/png', 'image/heic'],
    videoTypes: ['video/mp4', 'video/quicktime'],
  },
}

// 외부 이미지 서버 없이 표시하는 목업용 안내 이미지입니다.
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#f3e8ec"/><text x="300" y="200" text-anchor="middle" fill="#775566" font-size="24">URLUV Preview</text></svg>')}`
const guide = { imageUrl: image, highlight: { x: 0.2, y: 0.25, width: 0.6, height: 0.1 } }
export const mockTemplates = ['크리스마스', '우리의 순간', '마음의 편지'].map((name, index) => ({
  templateId: index + 1,
  name,
  description: '소중한 순간을 담는 기념일 페이지',
  thumbnailUrl: image,
  sampleSiteUrl: null,
}))
const fail = (status, code, message, details = []) => {
  throw Object.assign(new Error(message), { status, code, details })
}
function templateDetail(templateId) {
  const template = mockTemplates.find((item) => item.templateId === Number(templateId))
  if (!template) fail(404, 'TEMPLATE_NOT_FOUND', '템플릿을 찾을 수 없어요.')
  return {
    ...template,
    guides: { memoryTitle: guide, memoryStory: guide },
    documents: [
      {
        documentNo: 1,
        photoSlots: 4,
        videoSlots: 4,
        minPhotos: 1,
        photoGuide: guide,
        videoGuide: guide,
      },
    ],
  }
}
function authorized(draftId, token) {
  const draft = drafts.get(Number(draftId))
  if (!draft) fail(404, 'DRAFT_NOT_FOUND', '주문서를 찾을 수 없어요.')
  if (!token || tokens.get(draft.draftId) !== token)
    fail(401, 'INVALID_DRAFT_TOKEN', '주문서 접근 정보가 올바르지 않아요.')
  return draft
}
function editable(draft) {
  if (draft.status !== 'DRAFT') fail(409, 'ALREADY_SUBMITTED', '이미 제출한 주문서예요.')
}
function validate(draft, step, code = 'VALIDATION_FAILED') {
  const details = []
  const missing = (field, value) => details.push({ field, reason: 'REQUIRED', value })
  if (step >= 1) {
    if (!draft.template) missing('templateId', 1)
    if (!mockOrderConfig.anniversaryTypes.some((item) => item.code === draft.anniversaryType))
      missing('anniversaryType', 1)
    if (draft.anniversaryType === 'ETC' && !draft.anniversaryEtcText?.trim())
      missing('anniversaryEtcText', 1)
  }
  if (step >= 2) {
    if (!draft.customerName?.trim()) missing('customerName', 2)
    if (!/^01\d{8,9}$/.test(draft.phone ?? '')) missing('phone', 2)
    if (!draft.sitePasswordSet) missing('sitePassword', 2)
    if (!draft.useStartDate) missing('useStartDate', 2)
    if (!draft.useEndDate) missing('useEndDate', 2)
  }
  if (step >= 3) {
    if (!draft.memoryTitle?.trim() || !draft.memoryStory?.trim()) missing('memoryStory', 3)
    if (!draft.musics?.length) missing('musics', 3)
    if (!draft.documents[0]?.photos.length) missing('documents.1.photos', 3)
  }
  if (details.length) fail(400, code, '필수 입력 항목을 확인해 주세요.', details)
}

/** API.js와 동일하게 성공 시 data, 실패 시 status/code/details가 담긴 오류를 반환합니다. */
export async function mockRequest(path, { method = 'GET', token, body } = {}) {
  const [pathname, query] = path.split('?')
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'sites') {
    // 독립된 완성 사이트 시연용 주소 /s/demo, 비밀번호 1225.
    if (parts[1] !== 'demo') fail(404, 'SITE_NOT_FOUND', '사이트를 찾을 수 없어요.')
    if (parts[2] === 'unlock' && method === 'POST') {
      if (!body.password) fail(400, 'VALIDATION_FAILED', '비밀번호를 입력해 주세요.')
      if (body.password !== '1225') fail(401, 'WRONG_SITE_PASSWORD', '비밀번호를 확인해 주세요.')
      const siteAccessToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      siteTokens.set(siteAccessToken, { siteKey: parts[1], expiresAt })
      return { siteAccessToken, expiresAt }
    }
    const session = siteTokens.get(token)
    if (!session || session.siteKey !== parts[1] || Date.parse(session.expiresAt) <= Date.now())
      fail(401, 'INVALID_SITE_TOKEN', '비밀번호를 다시 입력해 주세요.')
    return {
      templateId: 1,
      anniversaryType: 'COUPLE',
      anniversaryEtcText: null,
      memoryTitle: '함께 간직하는 추억',
      memoryStory: '기념 사이트의 샘플 이야기입니다.',
      musics: [],
      letters: [{ content: '소중한 하루를 오래 기억해요.' }],
      documents: [],
      useStartDate: dateAfter(0),
      useEndDate: dateAfter(6),
    }
  }
  if (pathname === '/order-config' && method === 'GET')
    return copy({ ...mockOrderConfig, minUseStartDate: dateAfter(7) })
  if (parts[0] === 'templates' && method === 'GET') {
    // 목업 템플릿은 모든 기념일 종류에서 선택 가능합니다.
    const filter = new URLSearchParams(query).get('anniversaryType')
    if (filter && !mockOrderConfig.anniversaryTypes.some((item) => item.code === filter)) return []
    return copy(parts[1] ? templateDetail(parts[1]) : mockTemplates)
  }
  if (pathname === '/drafts' && method === 'POST') {
    const draftId = sequence++
    const draftToken = crypto.randomUUID()
    tokens.set(draftId, draftToken)
    drafts.set(draftId, {
      draftId,
      orderNo: null,
      status: 'DRAFT',
      currentStep: 1,
      template: null,
      anniversaryType: null,
      anniversaryEtcText: null,
      customerName: null,
      phone: null,
      useStartDate: null,
      useEndDate: null,
      memoryInput: null,
      musics: [],
      letters: [],
      sitePasswordSet: false,
      memoryTitle: null,
      memoryStory: null,
      documents: [{ documentNo: 1, photos: [], videos: [] }],
      updatedAt: now(),
    })
    return { draftId, draftToken, currentStep: 1 }
  }
  if (pathname === '/drafts/lookup' && method === 'POST') {
    if (!body.customerName?.trim() || !/^01\d{8,9}$/.test(body.phone))
      fail(400, 'VALIDATION_FAILED', '이름과 전화번호를 확인해 주세요.')
    const found = [...drafts.values()].filter(
      (draft) =>
        draft.customerName === body.customerName &&
        draft.phone === body.phone &&
        draft.status !== 'CANCELED',
    )
    if (!found.length) fail(404, 'DRAFT_NOT_FOUND', '저장된 주문서가 없어요.')
    return found.map((draft) => {
      const draftToken = crypto.randomUUID()
      tokens.set(draft.draftId, draftToken)
      return {
        draftId: draft.draftId,
        draftToken,
        orderNo: draft.orderNo,
        status: draft.status,
        templateName: draft.template?.name ?? null,
        currentStep: draft.currentStep,
        updatedAt: draft.updatedAt,
      }
    })
  }
  if (parts[0] === 'drafts' && parts[1]) {
    const draft = authorized(parts[1], token)
    if (parts.length === 2 && method === 'GET') return copy(draft)
    editable(draft)
    if (parts.length === 2 && method === 'PATCH') {
      const candidate = copy(draft)
      if (body.templateId !== undefined) {
        const template = body.templateId === null ? null : templateDetail(body.templateId)
        candidate.template = template
          ? { templateId: template.templateId, name: template.name }
          : null
      }
      for (const key of [
        'anniversaryType',
        'anniversaryEtcText',
        'customerName',
        'phone',
        'useStartDate',
        'useEndDate',
        'memoryInput',
        'musics',
        'letters',
      ])
        if (body[key] !== undefined) candidate[key] = body[key]
      if (candidate.useStartDate && candidate.useStartDate < dateAfter(7))
        fail(
          400,
          'INVALID_USE_START_DATE',
          '희망 수령일은 주문일 기준 7일 이후부터 선택할 수 있어요.',
        )
      if (
        candidate.useEndDate &&
        candidate.useStartDate &&
        candidate.useEndDate < candidate.useStartDate
      )
        fail(400, 'INVALID_USE_END_DATE', '종료일은 시작일 이후로 선택해 주세요.')
      if (body.sitePassword !== undefined) {
        if (!/^[^\s]{4,20}$/.test(body.sitePassword ?? ''))
          fail(400, 'VALIDATION_FAILED', '비밀번호는 공백 없이 4~20자로 입력해 주세요.', [
            { field: 'sitePassword', reason: 'INVALID_FORMAT', value: 2 },
          ])
        candidate.sitePasswordSet = true
      }
      candidate.musics ??= []
      candidate.letters ??= []
      if ((candidate.memoryInput?.length ?? 0) > 2000)
        fail(400, 'TEXT_TOO_LONG', '추억 원문은 2000자 이내로 적어 주세요.')
      for (const [index, music] of candidate.musics.entries()) {
        if (['title', 'artist'].some((key) => !music[key]?.trim() || music[key].length > 100))
          fail(400, 'VALIDATION_FAILED', '음악 제목과 가수를 1~100자로 입력해 주세요.', [
            { field: `musics[${index}]`, reason: 'INVALID_FORMAT', value: 3 },
          ])
        if (music.youtubeUrl) {
          let valid = false
          try {
            const url = new URL(music.youtubeUrl)
            valid =
              ['http:', 'https:'].includes(url.protocol) &&
              [
                'youtube.com',
                'www.youtube.com',
                'm.youtube.com',
                'music.youtube.com',
                'youtu.be',
              ].includes(url.hostname)
          } catch {}
          if (!valid)
            fail(400, 'INVALID_YOUTUBE_URL', '유튜브 주소를 확인해 주세요.', [
              { field: `musics[${index}].youtubeUrl`, reason: 'INVALID_URL', value: 3 },
            ])
        }
      }
      if (
        candidate.letters.some((letter) => !letter.content?.trim() || letter.content.length > 2000)
      )
        fail(400, 'VALIDATION_FAILED', '편지는 1~2000자로 입력해 주세요.')
      if (body.validateStep !== undefined) {
        if (![1, 2, 3].includes(body.validateStep))
          fail(400, 'VALIDATION_FAILED', '단계 번호를 확인해 주세요.')
        validate(candidate, body.validateStep)
        candidate.currentStep = Math.max(candidate.currentStep, body.validateStep + 1)
      }
      candidate.updatedAt = now()
      if (body.sitePassword !== undefined) passwords.set(candidate.draftId, body.sitePassword)
      drafts.set(candidate.draftId, candidate)
      return copy(candidate)
    }
    if (parts[2] === 'ai-story' && method === 'POST') {
      if (!body.memoryInput || body.memoryInput.trim().length < 20)
        fail(400, 'MEMORY_INPUT_TOO_SHORT', '추억을 조금 더 자세히 적어 주세요.')
      if (body.memoryInput.length > 2000)
        fail(400, 'TEXT_TOO_LONG', '추억은 2000자 이내로 적어 주세요.')
      const count = aiCounts.get(draft.draftId) ?? 0
      if (count >= 10) fail(429, 'AI_RATE_LIMITED', '이야기 생성 횟수를 모두 사용했어요.')
      aiCounts.set(draft.draftId, count + 1)
      draft.memoryInput = body.memoryInput
      draft.memoryTitle = '함께 간직하는 우리의 추억'
      draft.memoryStory = body.memoryInput
      draft.updatedAt = now()
      return {
        memoryInput: draft.memoryInput,
        memoryTitle: draft.memoryTitle,
        memoryStory: draft.memoryStory,
        remainingCount: 9 - count,
      }
    }
    if (parts[2] === 'ai-letter' && method === 'POST') {
      const input = body.letterInput?.trim() ?? ''
      if (input.length < 10)
        fail(400, 'LETTER_INPUT_TOO_SHORT', '편지에 담을 말을 조금 더 적어 주세요.')
      if (input.length > 2000) fail(400, 'TEXT_TOO_LONG', '편지는 2000자 이내로 적어 주세요.')
      const count = aiCounts.get(draft.draftId) ?? 0
      if (count >= 10) fail(429, 'AI_RATE_LIMITED', 'AI 생성 횟수를 모두 사용했어요.')
      aiCounts.set(draft.draftId, count + 1)
      return {
        input,
        content: `${input}\n\n늘 곁에 있어 줘서 고마워. 앞으로도 잘 지내자.`,
        remainingCount: 9 - count,
      }
    }
    if (parts[2] === 'media') {
      if (parts.length === 3 && method === 'POST') {
        const type = body.get('type')
        const documentNo = Number(body.get('documentNo'))
        const slot = Number(body.get('slot'))
        if (!draft.template || documentNo !== 1 || !Number.isInteger(slot) || slot < 1 || slot > 4)
          fail(400, 'INVALID_SLOT', '템플릿과 파일 위치를 확인해 주세요.')
        if (!['PHOTO', 'VIDEO'].includes(type))
          fail(400, 'UNSUPPORTED_FILE_TYPE', '파일 종류를 확인해 주세요.')
        const file = body.get('file')
        const limits = mockOrderConfig.limits
        const photo = type === 'PHOTO'
        if (
          !(file instanceof Blob) ||
          !(photo ? limits.photoTypes : limits.videoTypes).includes(file.type)
        )
          fail(400, 'UNSUPPORTED_FILE_TYPE', '허용되지 않은 파일 형식이에요.')
        if (file.size > (photo ? limits.photoMaxSizeMb : limits.videoMaxSizeMb) * 1024 * 1024)
          fail(413, 'FILE_TOO_LARGE', '파일 용량을 확인해 주세요.')
        const durationSec = body.has('durationSec') ? Number(body.get('durationSec')) : null
        if (durationSec > limits.videoMaxDurationSec)
          fail(400, 'VIDEO_TOO_LONG', '영상 길이를 확인해 주세요.')
        const mediaUrl = URL.createObjectURL(file)
        const thumbnail = body.get('thumbnail')
        const media = {
          mediaId: sequence++,
          type,
          documentNo,
          slot,
          url: mediaUrl,
          thumbnailUrl:
            thumbnail instanceof Blob ? URL.createObjectURL(thumbnail) : photo ? mediaUrl : null,
          durationSec,
          caption: null,
          title: null,
        }
        const list = draft.documents[0][photo ? 'photos' : 'videos']
        const existing = list.findIndex((item) => item.slot === slot)
        if (existing >= 0) {
          releaseMedia(list[existing])
          list.splice(existing, 1)
        }
        list.push(media)
        list.sort((a, b) => a.slot - b.slot)
        return copy(media)
      }
      for (const list of [draft.documents[0].photos, draft.documents[0].videos]) {
        const index = list.findIndex((item) => item.mediaId === Number(parts[3]))
        if (index < 0) continue
        if (method === 'DELETE') {
          releaseMedia(list[index])
          list.splice(index, 1)
          return undefined
        }
        if (method === 'PATCH') {
          const field = list[index].type === 'PHOTO' ? 'caption' : 'title'
          if (typeof body[field] !== 'string')
            fail(400, 'VALIDATION_FAILED', '미디어 문구를 확인해 주세요.')
          const max =
            field === 'caption'
              ? mockOrderConfig.limits.captionMaxLength
              : mockOrderConfig.limits.videoTitleMaxLength
          if (body[field].length > max) fail(400, 'TEXT_TOO_LONG', '글자 수를 초과했어요.')
          list[index][field] = body[field]
          return copy(list[index])
        }
      }
      fail(404, 'MEDIA_NOT_FOUND', '미디어를 찾을 수 없어요.')
    }
  }
  if (parts[0] === 'orders') {
    const draft = authorized(parts[1] ?? body?.draftId, token)
    if (parts.length === 1 && method === 'POST') {
      if (orders.has(draft.draftId)) return copy(orders.get(draft.draftId))
      validate(draft, 3, 'DRAFT_INCOMPLETE')
      if (draft.useStartDate < dateAfter(7))
        fail(400, 'INVALID_USE_START_DATE', '희망 수령일을 다시 선택해 주세요.')
      draft.status = 'SUBMITTED'
      draft.orderNo = `UL${dateAfter(0).replaceAll('-', '').slice(2)}-${draft.draftId}`
      const order = {
        orderId: draft.draftId,
        orderNo: draft.orderNo,
        status: draft.status,
        payStatus: 'PENDING',
        totalPrice: mockOrderConfig.price,
        depositorName: body.depositorName ?? draft.customerName,
        bankAccount: copy(bankAccount),
        depositDeadline: `${dateAfter(2)}T23:59:59+09:00`,
        templateName: draft.template.name,
        anniversaryType: draft.anniversaryType,
        customerName: draft.customerName,
        phone: draft.phone,
        useStartDate: draft.useStartDate,
        useEndDate: draft.useEndDate,
        submittedAt: now(),
      }
      orders.set(draft.draftId, order)
      return copy(order)
    }
    const order = orders.get(draft.draftId)
    if (!order) fail(409, 'NOT_SUBMITTED', '아직 제출하지 않은 주문서예요.')
    if (parts.length === 2 && method === 'GET') return copy(order)
    if (parts[2] === 'requests') {
      const list = requests.get(order.orderId) ?? []
      if (method === 'GET') return copy(list)
      if (method === 'POST') {
        if (!body.content?.trim()) fail(400, 'VALIDATION_FAILED', '요구사항을 입력해 주세요.')
        if (body.content.length > 2000) fail(400, 'TEXT_TOO_LONG', '2,000자 이내로 입력해 주세요.')
        if (
          body.requestType &&
          !['REVISION', 'ADDITION', 'INQUIRY', 'ETC'].includes(body.requestType)
        )
          fail(400, 'VALIDATION_FAILED', '요구사항 종류를 확인해 주세요.')
        const item = {
          requestId: sequence++,
          requestType: body.requestType ?? 'ETC',
          content: body.content,
          status: 'REQUESTED',
          adminReply: null,
          requestedAt: now(),
          doneAt: null,
        }
        list.unshift(item)
        requests.set(order.orderId, list)
        return copy(item)
      }
    }
  }
  fail(404, 'NOT_FOUND', '목업 API 경로를 찾을 수 없어요.')
}

function releaseMedia(media) {
  URL.revokeObjectURL(media.url)
  if (media.thumbnailUrl && media.thumbnailUrl !== media.url)
    URL.revokeObjectURL(media.thumbnailUrl)
}
