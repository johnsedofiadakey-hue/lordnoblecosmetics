import { useEffect } from 'react'
import { SiteFooter, SiteHeader, useSite } from './storefront'
import { fillShopDetails } from './cloud/site.js'

export const sectionId = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function formatDate(iso) {
  const date = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TermsPage() {
  const { content } = useSite()
  const { terms, shop } = content

  useEffect(() => { document.title = 'Terms and conditions — Lordnoble Cosmetics' }, [])
  useEffect(() => {
    if (!window.location.hash) return
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])

  // A section whose every line needs a shop detail that is not filled in yet is left out, not shown empty.
  const sections = terms.sections.map((section) => ({ ...section, lines: fillShopDetails(section.body, shop).split('\n').filter(Boolean) })).filter((section) => section.lines.length)

  return <main className="terms-page">
    <SiteHeader />
    <section className="page-hero">
      <h1>Terms and conditions</h1>
      <p className="page-hero__text">Please read these before you order. Last updated {formatDate(terms.updated)}.</p>
    </section>
    <div className="terms-layout">
      <nav className="terms-toc" aria-label="On this page">
        <b>On this page</b>
        <ol>{sections.map((section) => <li key={section.title}><a href={`#${sectionId(section.title)}`}>{section.title}</a></li>)}</ol>
      </nav>
      <article className="terms-body">
        {sections.map((section, index) => <section key={section.title} id={sectionId(section.title)}>
          <h2><span>{index + 1}.</span> {section.title}</h2>
          {section.lines.map((line, i) => <p key={i}>{line}</p>)}
        </section>)}
      </article>
    </div>
    <SiteFooter />
  </main>
}
