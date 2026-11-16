import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'
import type { Template } from '../services/API'
import { saleBadge } from '../utils/sale'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 할인 중인지(끝나는 날이 있고 원래 가격보다 쌀 때) */
const onSale = (t: Template) =>
  !!t.saleEndsAt && (t.regularPrice ?? t.basePrice) > t.basePrice

/** 카드 맨 아래 가격. 할인 중이면 원래 가격 취소선 + 할인 가격 */
function TemplatePrice({ template }: { template: Template }) {
  const regular = template.regularPrice ?? template.basePrice
  return (
    <span className={`template-price ${onSale(template) ? 'on-sale' : ''}`}>
      {onSale(template) && <s aria-label={`원래 가격 ${won(regular)}`}>{won(regular)}</s>}
      <b>{won(template.basePrice)}</b>
    </span>
  )
}

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
              className={`template-card ${data.template === template.templateId ? 'selected' : ''} ${template.closedMessage ? 'closed' : ''}`}
              key={template.templateId}
              onClick={() => update('template', template.templateId)}
              disabled={!!template.closedMessage}
              aria-pressed={data.template === template.templateId}
              aria-label={template.closedMessage ? `${template.name}, ${template.closedMessage}` : template.name}
            >
              {template.closedMessage ? (
                // 공개 전 템플릿: 사진 대신 회색 칸에 안내 문구
                <span className="template-placeholder template-closed-cover">
                  {template.closedMessage}
                </span>
              ) : (
                <img
                  className="template-placeholder"
                  src={template.thumbnailUrl}
                  alt={template.name}
                  style={{ objectFit: 'cover', width: '100%' }}
                />
              )}
              <span className="template-text">
                <strong>{template.name}</strong>
                <small>{template.description}</small>
                {!template.closedMessage && <TemplatePrice template={template} />}
              </span>
              {!template.closedMessage && onSale(template) && (
                <span className="sale-badge template-sale-badge">{saleBadge(template.saleLabel, template.saleEndsAt!)}</span>
              )}
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
