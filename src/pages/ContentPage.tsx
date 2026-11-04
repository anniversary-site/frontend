import { useOrder } from '../context/OrderContext'
import { OrderFormContent } from '../orderForms/registry'
import PeperoApiForm from '../orderForms/pepero/PeperoApiForm'

export default function ContentPage() {
  const { data, templateDetail } = useOrder()
  if (templateDetail?.formType === 'PEPERO') return <PeperoApiForm />
  return <OrderFormContent templateId={data.template} />
}
