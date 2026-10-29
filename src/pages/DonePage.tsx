import Icon from '../components/Icon'

export default function DonePage() {
  return (
    <main key="done" className="done-content page-transition">
      <div className="done-icon">
        <Icon name="check" />
      </div>
      <h1>주문이 접수되었습니다.</h1>
      <p>
        입금 확인 후 제작을 시작해요.
        <br />
        진행 상황과 완성된 링크는 입력하신 번호로 알려드릴게요.
      </p>
    </main>
  )
}
