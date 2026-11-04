import { useOrder } from '../../context/OrderContext'
import './PeperoContentForm.css'

export default function PeperoApiForm() {
  const { data, update, mediaSection, open } = useOrder()
  return <div className="pink-order-form pepero-order-form">
    <div className="content-intro"><h1>콘텐츠 입력</h1><p className="description">페이지에 들어갈 문구와 미디어를 채워주세요.</p></div>
    <section className="content-section pepero-main-section">
      <div className="section-heading">
        <h2>메인문구 작성 <span className="required-mark" aria-label="필수">*</span></h2>
        <button type="button" className="link-button" onClick={() => open({ type: 'position', target: 'main' })}>문구 위치 및 예시 보러가기 ›</button>
      </div>
      <p className="description">받으시는 분께 하고싶은 문구를 50자 이내로 작성해주세요.</p>
      <input className="text-input" aria-label="메인 문구" required placeholder="예) OO아, 2026 수능 화이팅하자!" maxLength={50} value={data.mainText} onChange={(event) => update('mainText', event.target.value)} />
    </section>
    {mediaSection('photos')}
  </div>
}
