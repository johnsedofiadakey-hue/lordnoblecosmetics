import { Fragment, useEffect, useMemo, useRef } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { ICON, pictureLink, ProductCard, SiteFooter, SiteHeader, SiteIcon, useSite } from './storefront'
import LordinaHero, { LordinaFeature, LordinaStory } from './LordinaHero'
import LordinaCollection from './LordinaCollection'

// The campaign leads into face care, then the five-product range. Prices and reviews come from the
// approved catalogue; the page stays browsable while commerce details are being prepared.

const BRAND_MARK = '/brand/lordnoble-mark.png'

function Heading({ kicker, title, accent, align = 'center', id }) {
  return <div className={`sec-head sec-head--${align}`}>
    {kicker ? <span className="kicker">{kicker}</span> : null}
    <h2 id={id}>{title} {accent ? <span className="gold">{accent}</span> : null}</h2>
  </div>
}

function ReviewCard({ review, productName }) {
  const initial = review.name.trim()[0]?.toUpperCase() || 'A'
  return <figure className="review-card">
    <span className="review-card__avatar" aria-hidden="true">{initial}</span>
    <div>
      <span className="review-card__stars" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} {...ICON} strokeWidth={1.4} className={n <= review.rating ? 'on' : ''} />)}</span>
      <blockquote>“{review.text}”</blockquote>
      <figcaption>— {review.name}{review.location ? `, ${review.location}` : ''}{productName ? <small>{productName}</small> : null}</figcaption>
    </div>
  </figure>
}

export default function App() {
  const { content, groups: products, reviews } = useSite()
  const { home } = content
  const rail = useRef(null)
  useEffect(() => { document.title = 'Lordina | Lordnoble Cosmetics' }, [])
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const nodes = document.querySelectorAll('.lordina-feature, .lordina-range__intro, .lordina-range__item, .lordina-story__photo, .lordina-story__copy, .home .loved, .home .why, .home .reviews, .home .cta')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' })
    nodes.forEach((node) => {
      node.classList.add('motion-item')
      observer.observe(node)
    })
    return () => observer.disconnect()
  }, [home, products.length, reviews.length])

  const whyItems = (home.whyItems || []).filter((item) => item?.label?.trim())
  // Most loved: the owner's best sellers, otherwise every product on show.
  const loved = useMemo(() => {
    const best = products.filter((product) => product.bestSeller)
    return best.length ? best : products
  }, [products])
  const shownReviews = reviews.slice(0, 3)
  const productName = (id) => products.find((product) => product.id === id)?.name || ''
  const scrollRail = (direction) => {
    const node = rail.current
    if (node) node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: 'smooth' })
  }

  const section_explore = <><LordinaCollection products={products} /><LordinaStory home={home} /></>
  const section_loved = loved.length ? <>
    <section className="section loved" aria-labelledby="loved-title">
      <div className="loved__head">
        <Heading kicker={products.some((product) => product.bestSeller) ? home.bestKicker : 'The shop'} title={products.some((product) => product.bestSeller) ? home.bestTitle : 'Available to order'} align="left" id="loved-title" />
        {loved.length > 4 ? <div className="rail-arrows">
          <button onClick={() => scrollRail(-1)} aria-label="Previous products"><ChevronLeft {...ICON} /></button>
          <button className="is-dark" onClick={() => scrollRail(1)} aria-label="Next products"><ChevronRight {...ICON} /></button>
        </div> : null}
      </div>
      <div className="product-rail" ref={rail}>{loved.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  </> : null
  const section_why = <>
    {whyItems.length ? <section className="why" aria-labelledby="why-title">
      <h2 id="why-title">{home.whyTitle}<br />{home.whyAccent}</h2>
      <ul>{whyItems.map((item) => <li key={item.label}><span><SiteIcon name={item.icon} strokeWidth={1.2} /></span>{item.label}</li>)}</ul>
    </section> : null}
  </>
  const section_reviews = shownReviews.length ? <>
    <section className="section reviews" aria-labelledby="reviews-title">
      <Heading kicker={home.reviewsKicker} title={home.reviewsTitle} id="reviews-title" />
      <div className="review-grid">{shownReviews.map((review) => <ReviewCard key={review.id} review={review} productName={productName(review.productId)} />)}</div>
      {reviews.length > 3 ? <a className="view-all view-all--center" href="/reviews">Read all reviews <ArrowRight {...ICON} /></a> : null}
    </section>
  </> : null
  const section_cta = products.length && home.ctaImage && home.ctaTitle ? <>
    <section className="cta" aria-labelledby="cta-title">
      <span className="cta__ribbon" aria-hidden="true" />
      <div className="cta__art"><img src={pictureLink(home.ctaImage) || BRAND_MARK} alt="" loading="lazy" /></div>
      <div className="cta__copy"><h2 id="cta-title">{home.ctaTitle}</h2><p>{home.ctaText}</p></div>
      <a className="btn-gold" href="/shop">{home.ctaAction || 'Shop Now'} <ArrowRight {...ICON} /></a>
    </section>
  </> : null
  const sections = { explore: section_explore, loved: section_loved, why: section_why, reviews: section_reviews, cta: section_cta }

  return <main className="home">
    <SiteHeader dark={false} />
    <LordinaHero home={home} />
    <LordinaFeature home={home} />

    {/* The owner's order; hidden sections are left out (Admin → Website → Layout and menu). */}
    {content.layout.sections.filter((section) => section.show).map((section) => <Fragment key={section.key}>{sections[section.key]}</Fragment>)}

    <SiteFooter />
  </main>
}
