import type { PreviewTarget } from '../types/order'
import Icon from './Icon'
import { useOrder } from '../context/OrderContext'

const LABELS = { main: '메인 문구', sub: '서브 문구', photos: '사진', videos: '영상' }

interface PositionPreviewProps {
  target?: PreviewTarget
  documentNo?: number
  onClose: () => void
}

export default function PositionPreview({ target, documentNo, onClose }: PositionPreviewProps) {
  const { templateDetail, templates } = useOrder()
  const document =
    templateDetail?.documents.find((item) => item.documentNo === documentNo) ??
    templateDetail?.documents[0]
  const guide =
    target === 'main'
      ? templateDetail?.guides.mainText
      : target === 'sub'
        ? templateDetail?.guides.subText
        : target === 'photos'
          ? document?.photoGuide
          : document?.videoGuide
  return (
    <>
      <header className="preview-modal-header">
        <h2 id="sheet-heading">{target ? `${LABELS[target]} 위치 확인` : '웹사이트 미리보기'}</h2>
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
        {target ? (
          guide ? (
            <div style={{ position: 'relative' }}>
              <img
                src={guide.imageUrl}
                alt={`${LABELS[target]} 위치 안내`}
                style={{ width: '100%', display: 'block' }}
              />
              <span
                aria-label="입력 내용 표시 위치"
                style={{
                  position: 'absolute',
                  border: '2px solid #d45c84',
                  boxSizing: 'border-box',
                  left: `${guide.highlight.x * 100}%`,
                  top: `${guide.highlight.y * 100}%`,
                  width: `${guide.highlight.width * 100}%`,
                  height: `${guide.highlight.height * 100}%`,
                }}
              />
            </div>
          ) : (
            <p>위치 안내 이미지가 아직 등록되지 않았어요.</p>
          )
        ) : (
          templates.map((template) => (
            <article key={template.templateId}>
              <img src={template.thumbnailUrl} alt={template.name} style={{ maxWidth: '100%' }} />
              <h3>{template.name}</h3>
              {template.sampleSiteUrl ? (
                <a href={template.sampleSiteUrl} target="_blank" rel="noreferrer">
                  샘플 사이트 보기
                </a>
              ) : (
                <p>샘플 사이트 준비 중</p>
              )}
            </article>
          ))
        )}
      </div>

      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
