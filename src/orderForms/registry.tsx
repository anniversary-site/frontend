import PinkSiteContentForm from './pinkSite/PinkSiteContentForm'
import PinkSiteGuideModal from './pinkSite/PinkSiteGuideModal'
import type { OrderFormDefinition, OrderFormGuideProps } from './types'

export type OrderFormId = 'pink-site'

const forms: Record<OrderFormId, OrderFormDefinition> = {
  'pink-site': { Content: PinkSiteContentForm, Guide: PinkSiteGuideModal },
}

// 새 주문 양식이 생기면 템플릿 ID와 양식 컴포넌트만 이 레지스트리에 추가합니다.
const formByTemplateId: Partial<Record<number, OrderFormId>> = {}

function resolveForm(templateId: number): OrderFormDefinition {
  return forms[formByTemplateId[templateId] ?? 'pink-site']
}

export function OrderFormContent({ templateId }: { templateId: number }) {
  const Content = resolveForm(templateId).Content
  return <Content />
}

export function OrderFormGuide(props: OrderFormGuideProps & { templateId: number }) {
  const Guide = resolveForm(props.templateId).Guide
  return <Guide target={props.target} documentNo={props.documentNo} onClose={props.onClose} />
}
