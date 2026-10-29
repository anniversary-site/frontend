import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../components/Button'
import { useOrder } from '../context/OrderContext'
import { formatPhone, isValidPhone } from '../utils/order'

export default function OrderLoadPage() {
  const { load } = useOrder()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const valid = isValidPhone(phone)
  const displayedError = error || (touched && !valid ? '올바른 휴대폰 번호를 입력해 주세요.' : '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError('')
    try {
      const found = await load(phone)
      if (!found)
        setError('이 번호로 저장된 주문서가 없어요. 저장할 때 입력한 번호를 확인해 주세요.')
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
        <h2>전화번호로 조회해주세요</h2>
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
      <p id="lookup-help" className="load-help">
        이 브라우저에 저장한 최신 주문서를 불러와요.
      </p>
    </main>
  )
}
