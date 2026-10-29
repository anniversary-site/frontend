import type { Page } from '../types/order'

// 모든 페이지 URL을 한 곳에서 관리합니다.
export const PAGE_PATHS: Record<Page, string> = {
  main: '/',
  start: '/order',
  load: '/order/load',
  template: '/order/template',
  info: '/order/info',
  content: '/order/content',
  review: '/order/review',
  done: '/order/done',
}

export function pageFromPath(pathname: string): Page {
  const path = pathname.replace(/\/+$/, '') || '/'
  return (Object.keys(PAGE_PATHS) as Page[]).find((page) => PAGE_PATHS[page] === path) || 'main'
}
