import Icon from '../../components/Icon'
import { useOrder } from '../../context/OrderContext'
import type { Guide } from '../../services/API'
import type { OrderFormGuideProps } from '../types'

const titles = {
  main: 'OUR STORY 위치 및 예시',
  sub: 'OUR STORY 위치 및 예시',
  story: 'OUR STORY 위치 및 예시',
  letters: 'LETTER 위치 및 예시',
  music: 'MUSIC 위치 및 예시',
  photos: '사진 위치 및 예시',
  videos: '영상 위치 및 예시',
} as const

function GuideImage({ label, guide }: { label: string; guide?: Guide }) {
  if (!guide) return <p className="guide-empty">{label} 안내 이미지가 아직 등록되지 않았어요.</p>
  return (
    <section className="guide-image-section">
      <h3>{label}</h3>
      <div className="guide-image-wrap">
        <img src={guide.imageUrl} alt={`${label} 위치 안내`} />
        <span
          aria-label={`${label} 표시 위치`}
          style={{
            left: `${guide.highlight.x * 100}%`,
            top: `${guide.highlight.y * 100}%`,
            width: `${guide.highlight.width * 100}%`,
            height: `${guide.highlight.height * 100}%`,
          }}
        />
      </div>
    </section>
  )
}

export default function PinkSiteGuideModal({ target, documentNo, onClose }: OrderFormGuideProps) {
  const { templateDetail } = useOrder()
  const document =
    templateDetail?.documents.find((item) => item.documentNo === documentNo) ??
    templateDetail?.documents[0]

  return (
    <>
      <header className="preview-modal-header">
        <h2 id="sheet-heading">{titles[target]}</h2>
        <button
          type="button"
          className="preview-close"
          aria-label="미리보기 닫기"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="preview-modal-body order-form-guide">
        {(target === 'story' || target === 'main' || target === 'sub') && (
          <>
            <GuideImage label="추억 제목" guide={templateDetail?.guides.memoryTitle} />
            <GuideImage label="추억 이야기" guide={templateDetail?.guides.memoryStory} />
          </>
        )}
        {target === 'letters' && (
          <div className="folder-example letter-example">
            <span>LETTER</span>
            <p>주고받은 편지나 기억에 남는 마음이 이 영역에 표시돼요.</p>
          </div>
        )}
        {target === 'music' && (
          <div className="folder-example music-example">
            <span>MUSIC</span>
            <strong>음악 제목</strong>
            <p>가수 · 앨범</p>
            <small>YouTube 링크가 있으면 음악을 바로 열 수 있어요.</small>
          </div>
        )}
        {target === 'photos' && <GuideImage label="사진" guide={document?.photoGuide} />}
        {target === 'videos' && <GuideImage label="영상" guide={document?.videoGuide} />}
      </div>
      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
