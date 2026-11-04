import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import PeperoContentForm from '../orderForms/pepero/PeperoContentForm'
import '../App.css'

export default function PeperoOrderPage() {
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => document.documentElement.style.setProperty('--keyboard-offset', `${viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0}px`)
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    return () => {
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      document.documentElement.style.removeProperty('--keyboard-offset')
    }
  }, [])
  return <>
    <header className="pepero-order-header"><Link to="/">‹ 뒤로가기</Link><strong>주문서 작성</strong><span>빼빼로데이</span></header>
    <main className="order-content"><PeperoContentForm /></main>
  </>
}
