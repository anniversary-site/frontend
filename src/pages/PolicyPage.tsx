import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import './PolicyPage.css'

// 운영자가 확정하기 전까지 실제 적용 정책으로 오인하지 않도록 초안으로 표시합니다.
const policies: Record<
  string,
  { title: string; description: string; sections: { title: string; body: string }[] }
> = {
  privacy: {
    title: '개인정보처리방침',
    description: '주문 및 제작 과정에서 다루는 개인정보의 처리 기준을 안내할 페이지입니다.',
    sections: [
      { title: '수집 항목·이용 목적', body: '' },
      { title: '보관 기간·파기 방법', body: '' },
      { title: '위탁·제3자 제공·국외 이전', body: '' },
      { title: '열람·정정·삭제 요청', body: '' },
    ],
  },
  terms: {
    title: '이용약관',
    description: '기념일 웹사이트 주문과 제작 서비스의 이용 기준을 안내할 페이지입니다.',
    sections: [
      { title: '서비스 범위', body: '' },
      { title: '주문·입금·제작·전달', body: '' },
      { title: '콘텐츠 이용·사용 기간', body: '' },
      { title: '수정 요청·분쟁 처리', body: '' },
    ],
  },
  refunds: {
    title: '취소·환불 정책',
    description: '주문 단계별 취소·환불 기준을 안내할 페이지입니다.',
    sections: [
      { title: '입금 전·제작 시작 전', body: '' },
      { title: '제작 진행 중', body: '' },
      { title: '납품 이후·제작 지연·하자', body: '' },
      { title: '신청·환급 절차', body: '' },
    ],
  },
  contact: {
    title: '운영자 정보·문의',
    description: '서비스 운영자와 문의 방법을 안내할 페이지입니다.',
    sections: [
      { title: '서비스 정보', body: '' },
      { title: '문의 방법', body: '' },
    ],
  },
}

export default function PolicyPage() {
  const { slug = '' } = useParams()
  const policy = policies[slug]
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])
  if (!policy) return <Navigate to="/" replace />
  return (
    <div className="policy-page">
      <header className="policy-header">
        <Link to="/" className="policy-logo">
          URLUV
        </Link>
        <Link to="/">홈으로 돌아가기</Link>
      </header>
      <main className="policy-content">
        <span className="policy-draft">작성 중인 초안</span>
        <h1>{policy.title}</h1>
        <p className="policy-description">{policy.description}</p>
        <aside className="policy-notice">
          운영 기준을 정리 중이며, 아래 미정 항목은 아직 확정된 정책이 아닙니다. 시행일과 세부
          내용을 확정한 뒤 게시할 예정입니다.
        </aside>
        {policy.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div className="policy-empty-section" aria-label="내용 미작성">
              {section.body && <p>{section.body}</p>}
            </div>
          </section>
        ))}
        <p className="policy-effective">시행일: —</p>
      </main>
      <SiteFooter />
    </div>
  )
}
