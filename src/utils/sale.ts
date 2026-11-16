/** 할인 끝나는 날(한국 시간). 끝나는 시각이 0시면 그 전날까지로 보여줍니다. 예: "11/22까지" */
export function saleUntil(endsAt: string) {
  const last = new Date(new Date(endsAt).getTime() - 1)
  const [m, d] = last
    .toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })
    .split('/')
  return `${m}/${d}까지`
}
