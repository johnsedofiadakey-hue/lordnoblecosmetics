import { useEffect, useState } from 'react'
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, Star, Truck } from 'lucide-react'
import { ICON, pictureLink, SiteFooter, SiteHeader, SocialIcon, useSite, webLink, whatsappLink } from './storefront'
import { checkReview, cleanReview } from './cloud/site.js'

// About Us, Reviews and Contact: the extra pages in the client's reference menu. Their words come from
// Admin → Website (About page, Reviews, Shop details).

function PageHero({ kicker, title, accent, children }) {
  return <section className="page-hero">
    {kicker ? <span className="kicker">{kicker}</span> : null}
    <h1>{title}{accent ? <> <span className="gold">{accent}</span></> : null}</h1>
    {children}
  </section>
}

// ---- About -------------------------------------------------------------------------------------------

export function AboutPage() {
  const { content } = useSite()
  const { about } = content
  const image = pictureLink(about.image)
  const paragraphs = String(about.text || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  useEffect(() => { document.title = 'About Us — Lordnoble Cosmetics' }, [])
  return <main className="info-page">
    <SiteHeader />
    <PageHero kicker="About us" title={about.title || 'About Lordnoble'} />
    <section className={`section about ${image ? '' : 'about--text'}`}>
      {image ? <div className="about__photo"><img src={image} alt={about.imageAlt || ''} /></div> : null}
      <div className="about__copy">
        {paragraphs.length ? paragraphs.map((part, i) => <p key={i}>{part}</p>)
          : <p>Lordnoble Cosmetics sells the Lordina range of face and body care.</p>}
        <a className="btn-wine" href="/shop">Shop Lordina <ArrowRight {...ICON} /></a>
      </div>
    </section>
    <SiteFooter />
  </main>
}

// ---- Reviews -----------------------------------------------------------------------------------------

export function StarPicker({ value, onChange }) {
  return <div className="star-picker" role="radiogroup" aria-label="Your rating">
    {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={n <= value ? 'on' : ''} onClick={() => onChange(n)}><Star {...ICON} strokeWidth={1.4} /></button>)}
  </div>
}

// A customer's review. It goes to the owner first and only appears once she approves it.
export function ReviewForm({ productId = '', products = [] }) {
  const { submitReview } = useSite()
  const [draft, setDraft] = useState({ name: '', location: '', text: '', rating: 0, productId })
  const [phase, setPhase] = useState({ kind: 'idle', message: '' })
  const send = async (event) => {
    event.preventDefault()
    const review = cleanReview(draft)
    const problem = checkReview(review)
    if (problem) { setPhase({ kind: 'error', message: problem }); return }
    setPhase({ kind: 'sending', message: '' })
    try {
      await submitReview(review)
      setPhase({ kind: 'sent', message: 'Thank you. Your review will appear once we have checked it.' })
      setDraft({ name: '', location: '', text: '', rating: 0, productId })
    } catch {
      setPhase({ kind: 'error', message: 'Your review could not be sent. Check your internet and try again.' })
    }
  }
  if (phase.kind === 'sent') return <p className="review-form__done" role="status">{phase.message}</p>
  return <form className="review-form" onSubmit={send} noValidate>
    <StarPicker value={draft.rating} onChange={(rating) => setDraft({ ...draft, rating })} />
    {products.length ? <label><span>Product</span><select value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })}><option value="">The shop in general</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : null}
    <div className="review-form__row">
      <label><span>First name</span><input value={draft.name} maxLength={40} autoComplete="given-name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label><span>Town <em>optional</em></span><input value={draft.location} maxLength={40} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
    </div>
    <label><span>Your review</span><textarea rows={4} value={draft.text} maxLength={600} onChange={(event) => setDraft({ ...draft, text: event.target.value })} /></label>
    <p className="review-form__note">We show your first name and town with your review. We check every review before it appears.</p>
    {phase.kind === 'error' ? <p className="review-form__error" role="alert">{phase.message}</p> : null}
    <button className="btn-wine" type="submit" disabled={phase.kind === 'sending'}>{phase.kind === 'sending' ? 'Sending…' : 'Send review'}</button>
  </form>
}

export function ReviewsPage() {
  const { content, reviews, groups: products } = useSite()
  const { pages } = content
  const productName = (id) => products.find((product) => product.id === id)?.name || ''
  useEffect(() => { document.title = 'Reviews — Lordnoble Cosmetics' }, [])
  return <main className="info-page">
    <SiteHeader />
    <PageHero kicker={pages.reviewsKicker} title={pages.reviewsTitle} accent={pages.reviewsAccent} />
    <section className="section">
      {reviews.length ? <div className="review-grid">{reviews.map((review) => <figure className="review-card" key={review.id}>
        <span className="review-card__avatar" aria-hidden="true">{review.name.trim()[0]?.toUpperCase()}</span>
        <div>
          <span className="review-card__stars" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} {...ICON} strokeWidth={1.4} className={n <= review.rating ? 'on' : ''} />)}</span>
          <blockquote>“{review.text}”</blockquote>
          <figcaption>— {review.name}{review.location ? `, ${review.location}` : ''}{productName(review.productId) ? <small>{productName(review.productId)}</small> : null}</figcaption>
        </div>
      </figure>)}</div> : <p className="review-empty">No reviews yet. Bought something from us? Tell other customers what you think below.</p>}
    </section>
    <section className="section write-review" id="write" aria-labelledby="write-title">
      <h2 id="write-title">Write a review</h2>
      <ReviewForm products={products} />
    </section>
    <SiteFooter />
  </main>
}

// ---- Contact -----------------------------------------------------------------------------------------

export function ContactPage() {
  const { content } = useSite()
  const { shop } = content
  const wa = whatsappLink(shop.whatsapp)
  const socials = ['instagram', 'tiktok', 'facebook'].map((name) => ({ name, href: webLink(shop[name]) })).filter((item) => item.href)
  useEffect(() => { document.title = 'Contact — Lordnoble Cosmetics' }, [])
  const cards = [
    shop.phone ? { Icon: Phone, title: 'Call us', text: shop.phone, href: `tel:${shop.phone.replace(/\s/g, '')}` } : null,
    wa ? { Icon: MessageCircle, title: 'WhatsApp', text: 'Chat with us', href: wa, external: true } : null,
    shop.email ? { Icon: Mail, title: 'Email', text: shop.email, href: `mailto:${shop.email}` } : null,
    shop.address ? { Icon: MapPin, title: 'Visit the shop', text: shop.address } : null,
    shop.hours ? { Icon: Clock, title: 'Opening hours', text: shop.hours } : null,
    shop.deliveryAreas ? { Icon: Truck, title: 'Delivery', text: `${shop.deliveryAreas}${shop.deliveryTime ? ` · usually ${shop.deliveryTime}` : ''}` } : null,
  ].filter(Boolean)
  return <main className="info-page">
    <SiteHeader />
    <PageHero kicker={content.pages.contactKicker} title={content.pages.contactTitle} accent={content.pages.contactAccent}>
      {content.pages.contactText ? <p className="page-hero__text">{content.pages.contactText}</p> : null}
    </PageHero>
    <section className="section">
      {cards.length ? <div className="contact-grid">{cards.map(({ Icon, title, text, href, external }) => {
        const inner = <><span className="contact-card__icon"><Icon {...ICON} strokeWidth={1.4} /></span><b>{title}</b><span>{text}</span></>
        return href ? <a key={title} className="contact-card" href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{inner}</a> : <div key={title} className="contact-card">{inner}</div>
      })}</div> : <p className="review-empty">You can order any Lordina product from <a href="/shop">the shop page</a>.</p>}
      {socials.length ? <div className="contact-social"><span>Follow us</span>{socials.map((item) => <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}><SocialIcon name={item.name} /></a>)}</div> : null}
    </section>
    <SiteFooter />
  </main>
}
