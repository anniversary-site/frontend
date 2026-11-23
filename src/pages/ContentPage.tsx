import { useOrder } from '../context/OrderContext'
import { OrderFormContent } from '../orderForms/registry'
import PeperoApiForm from '../orderForms/pepero/PeperoApiForm'
import ChristmasEditor from '../orderForms/christmas/ChristmasEditor'

export default function ContentPage() {
  const { data, templateDetail } = useOrder()
  if (templateDetail?.formType === 'PEPERO') return <PeperoApiForm />
  if (data.template === 1 || data.template === 3) return <ChristmasEditor mode="content" templateId={data.template} />
  return <OrderFormContent templateId={data.template} />
}
