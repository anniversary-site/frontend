import Icon from '../../components/Icon'
import PreviewModalBody from '../../components/PreviewModalBody'
import ZoomablePreview from '../../components/ZoomablePreview'
import { useOrder } from '../../context/OrderContext'
import type { Guide } from '../../services/API'
import type { OrderFormGuideProps } from '../types'

const titles = {
  main: 'OUR STORY 위치 및 예시',
  sub: 'OUR STORY 위치 및 예시',
  story: 'INFORMATION 위치 및 예시',
  letters: 'LETTER 위치 및 예시',
  music: 'MUSIC 위치 및 예시',
  url: 'URL 위치 및 예시',
  photos: '사진 위치 및 예시',
  videos: '영상 위치 및 예시',
} as const

function GuideImage({ label, guide }: { label: string; guide?: Guide }) {
  if (!guide) return <p className="guide-empty">{label} 안내 이미지가 아직 등록되지 않았어요.</p>
  return (
    <section className="guide-image-section">
      <ZoomablePreview key={guide.imageUrl} label={`${label} 위치 안내`}>
        <div className="guide-image-wrap">
          <img src={guide.imageUrl} alt={`${label} 위치 안내`} />
          {guide.highlight && guide.highlight.width > 0 && guide.highlight.height > 0 && (
            <span
              aria-label={`${label} 표시 위치`}
              style={{
                left: `${guide.highlight.x * 100}%`,
                top: `${guide.highlight.y * 100}%`,
                width: `${guide.highlight.width * 100}%`,
                height: `${guide.highlight.height * 100}%`,
              }}
            />
          )}
        </div>
      </ZoomablePreview>
    </section>
  )
}

export default function PinkSiteGuideModal({ target, documentNo, onClose }: OrderFormGuideProps) {
  const { templateDetail } = useOrder()
  const document =
    templateDetail?.documents.find((item) => item.documentNo === documentNo) ??
    templateDetail?.documents[0]
  const pepero = templateDetail?.formType === 'PEPERO'
  // 문구 항목의 예시 이미지(관리자가 DB guides에 넣음). 없으면 아래 글 예시를 보여 줍니다.
  const guides = templateDetail?.guides ?? {}
  const textGuide =
    target === 'main' && pepero
      ? guides.mainText
      : target === 'main' || target === 'sub' || target === 'story'
        ? guides.information
        : target === 'letters'
          ? guides.letter
          : target === 'url' || target === 'music'
            ? guides[target]
            : undefined
  const title = target === 'main' && pepero ? '문구 위치 및 예시' : titles[target]
  const label = title.replace(' 위치 및 예시', '')
  const imageGuide =
    target === 'photos' ? document?.photoGuide : target === 'videos' ? document?.videoGuide : textGuide

  return (
    <>
      <header className="preview-modal-header">
        <div>
          <h2 id="sheet-heading">{title}</h2>
          {imageGuide && (
            <p className="preview-modal-hint">
              두 손가락으로 확대·축소할 수 있어요.
            </p>
          )}
        </div>
        <button
          type="button"
          className="preview-close"
          aria-label="미리보기 닫기"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <PreviewModalBody className="order-form-guide">
        {textGuide && <GuideImage label={label} guide={textGuide} />}
        {!textGuide && (target === 'story' || target === 'main' || target === 'sub') && (
          <div className="folder-example information-example">
            <span>INFORMATION</span>
            <p>{`특별한 날: 2026.01.12\n특별한 장소: 서강대학교 AS관 라운지\n우리의 이야기: 데모데이 개발`}</p>
          </div>
        )}
        {!textGuide && target === 'letters' && (
          <div className="folder-example letter-example">
            <span>LETTER</span>
            <p>주고받은 편지나 기억에 남는 마음이 이 영역에 표시돼요.</p>
          </div>
        )}
        {!textGuide && target === 'music' && (
          <div className="folder-example music-example">
            <span>MUSIC</span>
            <strong>음악 제목</strong>
            <p>가수</p>
            <small>YouTube 링크가 있으면 음악을 바로 열 수 있어요.</small>
          </div>
        )}
        {!textGuide && target === 'url' && (
          <div className="folder-example url-example">
            <span>INTERNET</span>
            <strong>외부 사이트로 이동</strong>
            <p>입력한 URL이 웹사이트 하단의 INTERNET 아이콘에 연결돼요.</p>
          </div>
        )}
        {target === 'photos' && <GuideImage label="사진" guide={document?.photoGuide} />}
        {target === 'videos' && <GuideImage label="영상" guide={document?.videoGuide} />}
      </PreviewModalBody>
      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
