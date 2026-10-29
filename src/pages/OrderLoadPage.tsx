import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../components/Button'
import { useOrder } from '../context/OrderContext'
import { formatPhone, isValidPhone } from '../utils/order'
import type { DraftMatch } from '../services/API'

export default function OrderLoadPage() {
  const { load, selectDraft } = useOrder()
  const [name, setName] = useState('')
  const [matches, setMatches] = useState<DraftMatch[]>([])
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const valid = Boolean(name.trim() && isValidPhone(phone))
  const displayedError = error || (touched && !valid ? '올바른 휴대폰 번호를 입력해 주세요.' : '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError('')
    try {
      const found = await load(name, phone)
      setMatches(found)
      if (found.length === 1) await selectDraft(found[0])
      if (!found.length) setError('이름과 전화번호가 일치하는 주문서가 없어요.')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '주문서를 불러오지 못했어요. 다시 시도해 주세요.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="load-content page-transition">
      <p className="eyebrow">주문서 불러오기</p>
      <h1>주문서를 이어서 작성해보세요</h1>
      <form className="load-card" onSubmit={submit} noValidate aria-busy={loading}>
        <h2>이름과 전화번호로 조회해주세요</h2>
        <label className="sr-only" htmlFor="lookup-name">
          주문자 이름
        </label>
        <input
          id="lookup-name"
          className="text-input"
          autoComplete="name"
          placeholder="이름"
          value={name}
          maxLength={50}
          disabled={loading}
          onChange={(event) => {
            setName(event.target.value)
            setMatches([])
            setError('')
          }}
        />
        <label className="sr-only" htmlFor="lookup-phone">
          저장된 주문서의 전화번호
        </label>
        <input
          id="lookup-phone"
          className="text-input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="전화번호"
          value={phone}
          maxLength={13}
          disabled={loading}
          aria-invalid={Boolean(displayedError)}
          aria-describedby={displayedError ? 'lookup-error' : 'lookup-help'}
          onChange={(event) => {
            setPhone(formatPhone(event.target.value))
            setMatches([])
            setError('')
          }}
          onBlur={() => setTouched(true)}
        />
        {displayedError && (
          <p id="lookup-error" className="load-error" role="alert">
            {displayedError}
          </p>
        )}
        <Button type="submit" className="primary" loading={loading} disabled={!valid}>
          주문서 불러오기
        </Button>
      </form>
      {matches.length > 1 && (
        <section className="load-card" aria-label="주문서 선택">
          <h2>이어서 볼 주문서를 선택해 주세요</h2>
          {matches.map((match) => (
            <Button
              key={match.draftId}
              className="secondary"
              disabled={loading}
              onClick={async () => {
                setLoading(true)
                try {
                  await selectDraft(match)
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : '불러오지 못했어요.')
                } finally {
                  setLoading(false)
                }
              }}
            >
              {match.templateName ?? '작성 중 주문서'} ·{' '}
              {match.orderNo ?? `작성 ${match.currentStep}/4 단계`} · {match.status}
            </Button>
          ))}
        </section>
      )}
      <p id="lookup-help" className="load-help">
        주문서에 저장한 이름과 전화번호로 조회해요.
      </p>
    </main>
  )
}
