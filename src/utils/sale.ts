/** 할인 배지 문구. 예: "얼리버드 할인 (~11/22)" */
export function saleBadge(label: string | null | undefined, endsAt: string) {
  return `${label ?? ''} 할인 (~${lastDay(endsAt)})`.trim()
}

/** 할인 마지막 날(한국 시간) "11/22". 끝나는 시각이 0시면 그 전날. */
function lastDay(endsAt: string) {
  const last = new Date(new Date(endsAt).getTime() - 1)
  const [m, d] = last
    .toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })
    .split('/')
  return `${m}/${d}`
}
