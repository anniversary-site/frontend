import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function TemplatePage() {
  const { data, update, OCCASIONS } = useOrder()
  return (
    <>
      <section className="template-section">
        <h1>템플릿 선택</h1>
        <p className="description">마음을 가장 잘 표현할 디자인을 골라주세요.</p>
        <div className="template-grid" role="group" aria-label="템플릿 선택">
          {['소중한 오늘을 기록해요', '우리의 순간을 담아요', '마음을 전하는 페이지'].map(
            (desc, i) => (
              <button
                type="button"
                className={`template-card ${data.template === i ? 'selected' : ''}`}
                key={desc}
                onClick={() => update('template', i)}
                aria-pressed={data.template === i}
                aria-label={`템플릿 ${i + 1}: 크리스마스`}
              >
                <span className="template-placeholder" />
                <span className="template-text">
                  <strong>크리스마스</strong>
                  <small>{desc}</small>
                </span>
                <span className="template-check">
                  {data.template === i && <Icon name="check" small />}
                </span>
              </button>
            ),
          )}
        </div>
      </section>
      <section className="occasion-section">
        <h2>기념일 종류 입력</h2>
        <div className="occasion-list" role="group" aria-label="기념일 종류">
          {OCCASIONS.map((o) => (
            <button
              type="button"
              className={`occasion ${data.occasion === o ? 'selected' : ''}`}
              key={o}
              onClick={() => update('occasion', o)}
              aria-pressed={data.occasion === o}
            >
              <span>{o}</span>
              <i>{data.occasion === o && <Icon name="check" small />}</i>
            </button>
          ))}
        </div>
        {data.occasion === '기타' && (
          <input
            className="text-input other-input"
            required
            maxLength={40}
            placeholder="기념일 종류를 입력해 주세요"
            aria-label="기념일 종류"
            value={data.other}
            onChange={(e) => update('other', e.target.value)}
          />
        )}
      </section>
    </>
  )
}
