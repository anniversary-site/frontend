import { Link } from 'react-router-dom'
import './SiteFooter.css'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="서비스 정책">
        <Link to="/policies/privacy">개인정보처리방침</Link>
        <Link to="/policies/terms">이용약관</Link>
        <Link to="/policies/refunds">취소·환불 정책</Link>
        <Link to="/policies/contact">운영자 정보·문의</Link>
      </nav>
    </footer>
  )
}
