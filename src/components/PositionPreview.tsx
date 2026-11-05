import Icon from './Icon'
import { useOrder } from '../context/OrderContext'
import { OrderFormGuide } from '../orderForms/registry'
import type { PreviewTarget } from '../types/order'

interface PositionPreviewProps {
  target?: PreviewTarget
  documentNo?: number
  onClose: () => void
}

export default function PositionPreview({ target, documentNo, onClose }: PositionPreviewProps) {
  const { data, templates } = useOrder()
  if (target)
    return (
      <OrderFormGuide
        templateId={data.template}
        target={target}
        documentNo={documentNo}
        onClose={onClose}
      />
    )
  return (
    <>
      <header className="preview-modal-header">
        <h2 id="sheet-heading">웹사이트 미리보기</h2>
        <button
          type="button"
          className="preview-close"
          aria-label="미리보기 닫기"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="preview-modal-body" style={{ overflow: 'auto' }}>
        {templates.map((template) => (
          <article key={template.templateId}>
            <h3>{template.name}</h3>
            {template.previewImageUrl && (
              <img
                src={template.previewImageUrl}
                alt={`${template.name} 웹사이트 미리보기`}
                style={{ display: 'block', width: '100%', borderRadius: 12 }}
              />
            )}
            {template.sampleSiteUrl ? (
              <a href={template.sampleSiteUrl} target="_blank" rel="noreferrer">
                샘플 사이트 보기
              </a>
            ) : (
              !template.previewImageUrl && <p>샘플 사이트 준비 중</p>
            )}
          </article>
        ))}
      </div>

      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
