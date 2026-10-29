import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function HomePage() {
  const { go } = useOrder()
  return (
    <main key="main" className="home-content page-transition">
      <p className="eyebrow">마음을 오래 간직하는 방법</p>
      <h1>HOOKING 문구</h1>
      <p className="home-description">
        소중한 날의 사진과 이야기를 하나의 웹사이트로 만들어 드려요.
      </p>
      <button className="button primary home-cta" onClick={() => go('start')}>
        주문서 작성하러가기 <Icon name="arrow" />
      </button>
    </main>
  )
}
