import { useOrder } from '../context/OrderContext'
import { OrderFormContent } from '../orderForms/registry'

export default function ContentPage() {
  const { data } = useOrder()
  return <OrderFormContent templateId={data.template} />
}
