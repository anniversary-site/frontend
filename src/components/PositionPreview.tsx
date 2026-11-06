import { useEffect, useState } from 'react'
import Icon from './Icon'
import PreviewModalBody from './PreviewModalBody'
import ZoomablePreview from './ZoomablePreview'
import { useOrder } from '../context/OrderContext'
import * as api from '../services/API'
import type { Template } from '../services/API'
import { OrderFormGuide } from '../orderForms/registry'
import type { PreviewTarget } from '../types/order'

interface PositionPreviewProps {
  target?: PreviewTarget
  documentNo?: number
  onClose: () => void
}

const templateSiteUrls: Partial<Record<number, string>> = {
  1: 'https://cupid.urluv.shop/',
  2: 'https://pepero.urluv.shop/',
}

export default function PositionPreview({ target, documentNo, onClose }: PositionPreviewProps) {
  const { data } = useOrder()
  if (target)
    return (
      <OrderFormGuide
        templateId={data.template}
        target={target}
        documentNo={documentNo}
        onClose={onClose}
      />
    )
  return <SitePreview onClose={onClose} />
}

/** 메인 화면에서는 템플릿 목록을 아직 안 불러왔을 수 있어서, 비어 있으면 여기서 불러옵니다. */
function SitePreview({ onClose }: { onClose: () => void }) {
  const { templates } = useOrder()
  const [fetched, setFetched] = useState<Template[]>([])
  useEffect(() => {
    if (templates.length) return
    let active = true
    api
      .getTemplates()
      .then((list) => {
        if (active) setFetched(list)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [templates.length])
  const list = templates.length ? templates : fetched
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

      <PreviewModalBody className="site-preview-list">
        {list.map((template) => {
          const siteUrl = template.sampleSiteUrl || templateSiteUrls[template.templateId]
          return (
            <article key={template.templateId} className="site-preview-card">
              {template.previewImageUrl ? (
                <ZoomablePreview
                  key={template.previewImageUrl}
                  label={`${template.name} 웹사이트 미리보기`}
                >
                  <img
                    className="site-preview-image"
                    src={template.previewImageUrl}
                    alt={`${template.name} 웹사이트 미리보기`}
                  />
                </ZoomablePreview>
              ) : (
                <div className="site-preview-image site-preview-soon">Coming Soon!</div>
              )}
              {siteUrl && (
                <a href={siteUrl} target="_blank" rel="noreferrer">
                  템플릿 사이트 보기
                </a>
              )}
            </article>
          )
        })}
      </PreviewModalBody>

      <footer className="preview-modal-footer">
        <button type="button" className="button primary" onClick={onClose}>
          확인
        </button>
      </footer>
    </>
  )
}
