import type { PreviewTarget } from '../types/order'
import Icon from './Icon'

const LABELS = { main: '메인 문구', sub: '서브 문구', photos: '사진', videos: '영상' }

interface PositionPreviewProps {
  target?: PreviewTarget
  onClose: () => void
}

export default function PositionPreview({ target, onClose }: PositionPreviewProps) {
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

      {/* 사이트 예시를 넣기 전까지 회색 배경만 표시합니다. */}
      <div className="preview-modal-body" />

      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
