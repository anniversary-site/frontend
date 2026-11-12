import type { OrderData } from '../types/order'
import type { Session } from './API'

export function canResumeTab(navigation: string, historyAction: string, locationKey: string) {
  return (
    historyAction === 'POP' &&
    (navigation === 'reload' || navigation === 'back_forward' || locationKey !== 'default')
  )
}

export function historyOrderSession(state: unknown): Session | null {
  if (!state || typeof state !== 'object') return null
  const session = (state as { orderSession?: Partial<Session> }).orderSession
  return session &&
    Number.isInteger(session.draftId) &&
    (session.draftId ?? 0) > 0 &&
    typeof session.draftToken === 'string' &&
    session.draftToken
    ? { draftId: session.draftId as number, draftToken: session.draftToken }
    : null
}

export function readTabOrder(key: string, state?: unknown) {
  const historySession = historyOrderSession(state)
  if (state && typeof state === 'object' && 'orderSession' in state && !historySession) return null
  const fallback = historySession
    ? { version: 1 as const, session: historySession, data: {} }
    : null
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (
      stored?.version !== 1 ||
      !Number.isInteger(stored.session?.draftId) ||
      stored.session.draftId <= 0 ||
      typeof stored.session.draftToken !== 'string' ||
      !stored.session.draftToken ||
      !stored.data ||
      typeof stored.data !== 'object' ||
      Array.isArray(stored.data)
    )
      return fallback
    if (
      historySession &&
      (stored.session.draftId !== historySession.draftId ||
        stored.session.draftToken !== historySession.draftToken)
    )
      return null
    return stored as { version: 1; session: Session; data: Record<string, unknown> }
  } catch {
    return fallback
  }
}

export function saveTabOrder(key: string, session: Session, data: OrderData) {
  const fields = Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !['sitePassword', 'sitePasswordSet', 'price'].includes(key),
    ),
  )
  sessionStorage.setItem(key, JSON.stringify({ version: 1, session, data: fields }))
}

export function restoreTabFields(
  current: OrderData,
  saved: Record<string, unknown>,
  templateIds: number[] = [],
): OrderData {
  const strings = Object.fromEntries(
    Object.entries(current)
      .filter(
        ([key, value]) =>
          typeof value === 'string' &&
          key !== 'sitePassword' &&
          key !== 'occasion' &&
          key !== 'letterChoice' &&
          typeof saved[key] === 'string',
      )
      .map(([key]) => [key, saved[key]]),
  )
  const musics =
    Array.isArray(saved.musics) &&
    saved.musics.every(
      (item) =>
        item &&
        typeof item.title === 'string' &&
        typeof item.artist === 'string' &&
        (item.youtubeUrl == null || typeof item.youtubeUrl === 'string'),
    )
      ? saved.musics
      : current.musics
  return {
    ...current,
    ...strings,
    template:
      typeof saved.template === 'number' && templateIds.includes(saved.template)
        ? saved.template
        : current.template,
    musics,
    occasion: ['연애 기념일', '생일', '결혼 기념일', '기타'].includes(String(saved.occasion))
      ? (saved.occasion as OrderData['occasion'])
      : current.occasion,
    letterChoice:
      saved.letterChoice === 'AI' ||
      saved.letterChoice === 'ORIGINAL' ||
      saved.letterChoice === null
        ? saved.letterChoice
        : current.letterChoice,
  }
}
