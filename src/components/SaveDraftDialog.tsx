import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from './Button'
import { formatPhone, isValidPhone } from '../utils/order'

interface SaveDraftDialogProps {
  initialPhone: string
  saving: boolean
  error: string
  onSave: (phone: string) => Promise<boolean>
  onClose: () => void
}

export default function SaveDraftDialog({
  initialPhone,
  saving,
  error,
  onSave,
  onClose,
}: SaveDraftDialogProps) {
  const [phone, setPhone] = useState(initialPhone)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidPhone(phone) || saving) return
    if (await onSave(phone)) onClose()
  }
  return (
    <form className="save-phone-form" onSubmit={submit} noValidate>
      <h2 id="sheet-heading">주문서를 저장할게요</h2>
      <p className="save-phone-description">나중에 불러올 때 사용할 전화번호를 입력해 주세요.</p>
      <label className="field-label" htmlFor="save-phone">
        전화번호
      </label>
      <input
        id="save-phone"
        className="text-input"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={13}
        placeholder="010-0000-0000"
        value={phone}
        disabled={saving}
        onChange={(event) => setPhone(formatPhone(event.target.value))}
        aria-describedby={error ? 'save-phone-error' : 'save-phone-help'}
      />
      {error && (
        <p id="save-phone-error" className="load-error" role="alert">
          {error}
        </p>
      )}
      <p id="save-phone-help" className="load-help">
        같은 번호로 저장하면 이전 내용을 최신 내용으로 갱신해요.
      </p>
      <div className="save-phone-actions">
        <Button type="button" className="secondary" onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button className="primary" type="submit" disabled={!isValidPhone(phone)} loading={saving}>
          저장하기
        </Button>
      </div>
    </form>
  )
}
