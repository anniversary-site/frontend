import { useOrder } from '../context/OrderContext'
import Icon from '../components/Icon'

export default function OrderStartPage() {
  const { go, setData, INITIAL, setFiles, emptyFiles, setSuggestions, setTouched, setAiErrors } =
    useOrder()
  return (
    <main key="start" className="start-content page-transition">
      <p className="eyebrow">주문 시작하기</p>
      <h1>어떻게 시작할까요?</h1>
      <div className="start-cards">
        <article>
          <span className="start-icon">
            <Icon name="plus" />
          </span>
          <h2>처음 작성하시나요?</h2>
          <button
            className="button primary"
            onClick={() => {
              setTouched({})
              setAiErrors({})
              setData({ ...INITIAL })
              setFiles(emptyFiles())
              setSuggestions({})
              go('template')
            }}
          >
            주문서 작성하러가기
          </button>
        </article>
        <article>
          <span className="start-icon">
            <Icon name="external" />
          </span>
          <h2>작성하시던 주문서가 있나요?</h2>
          <button className="button secondary" onClick={() => go('load')}>
            주문서 불러오기
          </button>
        </article>
      </div>
    </main>
  )
}
