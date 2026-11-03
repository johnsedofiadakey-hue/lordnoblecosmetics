import { Fragment, useEffect, useMemo, useRef } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { ICON, pictureLink, ProductCard, SiteFooter, SiteHeader, SiteIcon, useMenuCategories, useSite } from './storefront'

// The home page, built to the client's reference design. Every word and picture comes from Admin → Website;
// until the owner adds photos and products, the Lordnoble logo and campaign picture stand in, never invented products.

// The rose-gold monogram and the hero campaign still.
const BRAND_MARK = '/brand/lordnoble-mark.png'
const CAMPAIGN_STILL = '/campaign/hero-model.jpg'

// The range as it reads before the owner adds categories with photos (links go to the full shop).
const RANGE = [
  { name: 'Feminine care', text: 'Cleanse and balance', icon: 'lotus' },
  { name: 'Body care', text: 'Smooth and nourish', icon: 'body' },
  { name: 'Skin care', text: 'Glow and care', icon: 'face' },
  { name: 'Wellness', text: 'Everyday wellbeing', icon: 'leaf' },
  { name: 'Beauty tools', text: 'Tools for your routine', icon: 'tools' },
]

// "Beauty Products\nfor a More" -> line breaks
const lines = (text) => String(text || '').split('\n').flatMap((line, index) => (index ? [<br key={index} />, line] : [line]))

function Heading({ kicker, title, accent, align = 'center', id }) {
  return <div className={`sec-head sec-head--${align}`}>
    {kicker ? <span className="kicker">{kicker}</span> : null}
    <h2 id={id}>{title} {accent ? <span className="gold">{accent}</span> : null}</h2>
  </div>
}

function CategoryCard({ category }) {
  const image = pictureLink(category.image)
  return <a className="cat-card" href={category.href}>
    <span className={`cat-card__art ${image ? '' : 'is-empty'}`}>{image ? <img src={image} alt="" loading="lazy" /> : <span className="cat-card__glyph"><SiteIcon name={category.icon} strokeWidth={1} /></span>}</span>
    <span className="cat-card__foot">
      <span className="cat-card__icon"><SiteIcon name={category.icon} /></span>
      <span className="cat-card__words"><b>{category.name}</b>{category.text ? <small>{category.text}</small> : null}</span>
      <span className="cat-card__go"><ArrowRight {...ICON} /></span>
    </span>
  </a>
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
  const menuCategories = useMenuCategories()
  const rail = useRef(null)
  useEffect(() => { document.title = 'Lordnoble Cosmetics — Beauty products for a more confident you' }, [])

  const heroImage = pictureLink(home.heroImage) || CAMPAIGN_STILL
  const badges = (home.heroBadges || []).filter((badge) => badge?.label?.trim())
  const whyItems = (home.whyItems || []).filter((item) => item?.label?.trim())
  const categories = menuCategories.length
    ? menuCategories.map((category) => ({ ...category, href: `/shop?category=${encodeURIComponent(category.name)}` }))
    : RANGE.map((item) => ({ ...item, href: '/shop' }))
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

  const section_explore = <>
    <section className="section explore" aria-labelledby="explore-title">
      <div className="explore__head">
        <Heading kicker={home.categoriesKicker} title={home.categoriesTitle} accent={home.categoriesAccent} id="explore-title" />
        <a className="view-all" href="/shop">View All Products <ArrowRight {...ICON} /></a>
      </div>
      <div className="cat-grid">{categories.map((category) => <CategoryCard key={category.name} category={category} />)}</div>
    </section>
  </>
  const section_loved = <>
    <section className="section loved" aria-labelledby="loved-title">
      <div className="loved__head">
        <Heading kicker={home.bestKicker} title={home.bestTitle} align="left" id="loved-title" />
        {loved.length > 4 ? <div className="rail-arrows">
          <button onClick={() => scrollRail(-1)} aria-label="Previous products"><ChevronLeft {...ICON} /></button>
          <button className="is-dark" onClick={() => scrollRail(1)} aria-label="Next products"><ChevronRight {...ICON} /></button>
        </div> : null}
      </div>
      {loved.length ? <div className="product-rail" ref={rail}>{loved.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="loved__empty">
          <img src={BRAND_MARK} alt="Lordnoble Cosmetics monogram" />
          <div><b>Our shelves are being stocked.</b><p>Products appear here as soon as they are ready to order.</p><a className="btn-wine" href="/contact">Ask us about a product <ArrowRight {...ICON} /></a></div>
        </div>}
    </section>
  </>
  const section_why = <>
    {whyItems.length ? <section className="why" aria-labelledby="why-title">
      <h2 id="why-title">{home.whyTitle}<br />{home.whyAccent}</h2>
      <ul>{whyItems.map((item) => <li key={item.label}><span><SiteIcon name={item.icon} strokeWidth={1.2} /></span>{item.label}</li>)}</ul>
    </section> : null}
  </>
  const section_reviews = <>
    {/* Only real reviews the owner has approved; until there is one, an invitation instead of invented quotes. */}
    <section className="section reviews" aria-labelledby="reviews-title">
      <Heading kicker={home.reviewsKicker} title={home.reviewsTitle} id="reviews-title" />
      {shownReviews.length ? <div className="review-grid">{shownReviews.map((review) => <ReviewCard key={review.id} review={review} productName={productName(review.productId)} />)}</div>
        : <div className="review-invite"><p>Bought from us? Tell other customers what you think.</p><a className="btn-outline" href="/reviews#write">Write a review <ArrowRight {...ICON} /></a></div>}
      {reviews.length > 3 ? <a className="view-all view-all--center" href="/reviews">Read all reviews <ArrowRight {...ICON} /></a> : null}
    </section>
  </>
  const section_cta = <>
    <section className="cta" aria-labelledby="cta-title">
      <span className="cta__ribbon" aria-hidden="true" />
      <div className="cta__art"><img src={pictureLink(home.ctaImage) || BRAND_MARK} alt="" loading="lazy" /></div>
      <div className="cta__copy"><h2 id="cta-title">{home.ctaTitle}</h2><p>{home.ctaText}</p></div>
      <a className="btn-gold" href="/shop">{home.ctaAction || 'Shop Now'} <ArrowRight {...ICON} /></a>
    </section>
  </>
  const sections = { explore: section_explore, loved: section_loved, why: section_why, reviews: section_reviews, cta: section_cta }

  return <main className="home">
    <SiteHeader />

    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__photo"><img src={heroImage} alt={home.heroImageAlt || ''} fetchPriority="high" /></div>
      {home.heroScript ? <p className="hero__script" aria-hidden="true">{lines(home.heroScript)}</p> : null}
      <div className="hero__copy">
        {home.heroKicker ? <span className="kicker">{home.heroKicker}</span> : null}
        <h1 id="hero-title">{lines(home.heroTitle)}{home.heroAccent ? <><br /><span className="gold">{home.heroAccent}</span></> : null}</h1>
        {home.heroText ? <p className="hero__text">{lines(home.heroText)}</p> : null}
        <a className="btn-wine" href="/shop">{home.heroAction || 'Shop Now'} <ArrowRight {...ICON} /></a>
        {badges.length ? <ul className="hero__badges">{badges.map((badge) => <li key={badge.label}><span><SiteIcon name={badge.icon} /></span>{badge.label}</li>)}</ul> : null}
      </div>
    </section>

    {/* The owner's order; hidden sections are left out (Admin → Website → Layout and menu). */}
    {content.layout.sections.filter((section) => section.show).map((section) => <Fragment key={section.key}>{sections[section.key]}</Fragment>)}

    <SiteFooter />
  </main>
}
