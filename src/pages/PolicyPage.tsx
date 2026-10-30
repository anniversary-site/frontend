import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import policyData from '../data/policies.json'
import './PolicyPage.css'

const policies: Record<
  string,
  {
    title: string
    description: string
    effectiveDate: string
    sections: { title: string; body: string }[]
  }
> = policyData

// 원문을 HTML로 삽입하지 않고 문단과 표를 안전하게 렌더링합니다.
function PolicyBody({ text }: { text: string }) {
  const blocks: { table: boolean; lines: string[] }[] = []
  for (const line of text.split('\n')) {
    const table = line.trim().startsWith('|')
    const previous = blocks.at(-1)
    if (previous && previous.table === table) previous.lines.push(line)
    else blocks.push({ table, lines: [line] })
  }
  const cells = (line: string) =>
    line
      .trim()
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())
  return blocks.map((block, index) => {
    if (!block.table)
      return block.lines.join('\n').trim() && <p key={index}>{block.lines.join('\n').trim()}</p>
    const [heading, , ...rows] = block.lines
    return (
      <div className="policy-table-scroll" key={index}>
        <table>
          <thead>
            <tr>
              {cells(heading).map((cell, i) => (
                <th scope="col" key={i}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cells(row).map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  })
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
        <h1>{policy.title}</h1>
        {policy.effectiveDate && <p className="policy-effective">시행일: {policy.effectiveDate}</p>}
        {policy.description && <p className="policy-description">{policy.description}</p>}
        {policy.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <PolicyBody text={section.body} />
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  )
}
