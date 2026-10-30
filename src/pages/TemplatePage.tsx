import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function TemplatePage() {
  const { data, update, OCCASIONS, templates, config } = useOrder()
  return (
    <>
      <section className="template-section">
        <h1>
          템플릿 선택
          <span className="required-mark" aria-label="필수">
            {' '}
            *
          </span>
        </h1>
        <p className="description">마음을 가장 잘 표현할 디자인을 골라주세요.</p>
        <div className="template-grid" role="group" aria-label="템플릿 선택">
          {templates.map((template) => (
            <button
              type="button"
              className={`template-card ${data.template === template.templateId ? 'selected' : ''}`}
              key={template.templateId}
              onClick={() => update('template', template.templateId)}
              aria-pressed={data.template === template.templateId}
              aria-label={template.name}
            >
              <img
                className="template-placeholder"
                src={template.thumbnailUrl}
                alt={template.name}
                style={{ objectFit: 'cover', width: '100%' }}
              />
              <span className="template-text">
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </span>
              <span className="template-check">
                {data.template === template.templateId && <Icon name="check" small />}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="occasion-section">
        <h2>
          기념일 종류 입력
          <span className="required-mark" aria-label="필수">
            {' '}
            *
          </span>
        </h2>
        <div className="occasion-list" role="group" aria-label="기념일 종류">
          {OCCASIONS.filter((o) => config?.anniversaryTypes.some((type) => type.label === o)).map(
            (o) => (
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
            ),
          )}
        </div>
        {data.occasion === '기타' && (
          <input
            className="text-input other-input"
            required
            maxLength={30}
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
