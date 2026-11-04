import { useEffect, useRef, useState } from 'react'
import './PeperoContentForm.css'

type Photo = { url: string; caption: string }

/** 빼빼로 전용 화면 초안. API 연결 전까지 모든 입력은 화면 상태로만 유지합니다. */
export default function PeperoContentForm() {
  const [title, setTitle] = useState('')
  const [photos, setPhotos] = useState<(Photo | null)[]>(() => Array(20).fill(null))
  const [selected, setSelected] = useState<number | null>(null)
  const [caption, setCaption] = useState('')
  const [expanded, setExpanded] = useState(false)
  const urls = useRef(new Set<string>())
  const drag = useRef<number | null>(null)
  useEffect(() => {
    const created = urls.current
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  useEffect(() => {
    if (selected === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', close)
    }
  }, [selected])
  return (
    <div className="pepero-order-form">
      <div className="content-intro"><h1>콘텐츠 입력</h1><p className="description">페이지에 들어갈 문구와 미디어를 채워주세요.</p></div>
      <section className="content-section">
        <h2>메인문구 작성 <span className="required-mark">*</span></h2>
        <p className="description">웹사이트 상단에 표시할 문구를 20자 이내로 작성해주세요.</p>
        <input className="text-input" aria-label="메인 문구" placeholder="예) OO아, 빼빼로데이 축하해!" maxLength={20} value={title} onChange={(event) => setTitle(event.target.value)} />
        <small>{title.length}/20</small>
      </section>
      <section className="content-section">
        <h2>사진 업로드 <span className="required-mark">*</span> (최소 5장)</h2>
        <p className="description">기본 슬롯 20칸 제공 · 사진마다 10자 이내의 캡션을 작성할 수 있어요.</p>
        <div className="media-grid">
          {photos.map((photo, index) => (
            <div className="media-item" key={index}>
              <div className="media-tile">
                {photo ? <><img src={photo.url} alt={photo.caption || `사진 ${index + 1}`} /><button type="button" className="remove-media" aria-label={`사진 ${index + 1} 삭제`} onClick={() => {
                  URL.revokeObjectURL(photo.url); urls.current.delete(photo.url)
                  setPhotos((current) => current.map((item, i) => i === index ? null : item))
                }}>×</button></> : <label className="pepero-photo-picker">＋<span>사진 추가</span><input type="file" accept="image/*" aria-label={`사진 ${index + 1} 추가`} onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const url = URL.createObjectURL(file); urls.current.add(url)
                  setPhotos((current) => current.map((item, i) => i === index ? { url, caption: '' } : item))
                }} /></label>}
              </div>
              <button type="button" className="caption-button small-button" disabled={!photo} onClick={() => { setCaption(photo?.caption ?? ''); setExpanded(false); setSelected(index) }}>캡션 작성</button>
              {photo?.caption && <p className="media-caption">{photo.caption}</p>}
            </div>
          ))}
        </div>
      </section>
      {selected !== null && <div className="sheet-overlay" onClick={() => setSelected(null)}>
        <section className={`bottom-sheet${expanded ? ' is-expanded' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pepero-caption-title" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="pepero-handle" aria-label={expanded ? '하단 모드로 축소' : '전체 화면으로 확장'} onClick={() => { if (drag.current === null) setExpanded((value) => !value); drag.current = null }} onPointerDown={(event) => { drag.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerUp={(event) => { const distance = event.clientY - (drag.current ?? event.clientY); if (Math.abs(distance) > 40) { setExpanded(distance < 0) } else { drag.current = null } }}><span className="sheet-handle" /></button>
          <h2 id="pepero-caption-title">캡션 작성</h2>
          <div className="caption-input"><textarea aria-label="사진 캡션" autoFocus value={caption} maxLength={10} placeholder="예) 0618" onChange={(event) => setCaption(event.target.value)} /><span>{caption.length}/10</span></div>
          <button type="button" className="button primary" onClick={() => { setPhotos((current) => current.map((photo, index) => index === selected && photo ? { ...photo, caption } : photo)); setSelected(null) }}>완료</button>
        </section>
      </div>}
    </div>
  )
}
