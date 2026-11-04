import { ArrowRight } from 'lucide-react'
import { groupPriceLabel, ICON, orderLink, pictureLink } from './storefront'
import { HERO_IMAGE } from './cloud/site.js'
import { findRangeProduct } from './LordinaCollection'

// One product, one photo, a price or a way to order it. The second scene is the face cream that goes with it.
function OrderButton({ item, products, shop, label, className }) {
  const product = item ? findRangeProduct(item, products) : null
  if (product) return <a className={className} href={`/shop?product=${encodeURIComponent(product.id)}`}>{label} · {groupPriceLabel(product)} <ArrowRight {...ICON} /></a>
  const message = item ? `Hello Lordnoble, I would like to order the ${item.name}${item.size ? ` (${item.size})` : ''}.` : 'Hello Lordnoble, I would like to order.'
  const href = orderLink(shop, message)
  return <a className={className} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{label} <ArrowRight {...ICON} /></a>
}

export default function LordinaHero({ home, shop, products, payOnline }) {
  const image = pictureLink(home.heroImage) || HERO_IMAGE
  const secondImage = pictureLink(home.heroSecondImage)
  const range = home.range || []
  const serum = range.find((item) => item.key === 'serum')
  const cream = range.find((item) => item.key === 'cream')
  // Only what is true: each line appears once the owner has filled in that detail.
  const facts = [
    shop.deliveryAreas ? `Delivery to ${shop.deliveryAreas}` : '',
    payOnline ? 'Pay with MoMo or card' : '',
    shop.fdaNumber ? `FDA Ghana reg. ${shop.fdaNumber}` : '',
  ].filter(Boolean)

  return <>
    <section className="lordina-hero" aria-labelledby="hero-title">
      <div className="lordina-hero__copy">
        {home.heroKicker ? <p className="lordina-hero__eyebrow">{home.heroKicker}</p> : null}
        <h1 id="hero-title">{home.heroTitle}{home.heroAccent ? <span className="lordina-hero__accent"> {home.heroAccent}</span> : null}</h1>
        {home.heroText ? <p className="lordina-hero__text">{home.heroText}</p> : null}
        <div className="lordina-hero__actions">
          <OrderButton item={serum} products={products} shop={shop} label={home.heroAction || 'Order now'} className="lordina-hero__button" />
          <a className="lordina-hero__link" href="#lordina-range">See all {range.filter((item) => item.show !== false).length} products</a>
        </div>
        {facts.length ? <ul className="lordina-hero__facts">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
      </div>
      <div className="lordina-hero__portrait">
        <img src={image} alt={home.heroImageAlt || ''} width="956" height="1280" fetchPriority="high" decoding="async" />
      </div>
    </section>

    {secondImage ? <section className="lordina-ritual" aria-labelledby="lordina-ritual-title">
      <div className="lordina-ritual__photo"><img src={secondImage} alt={home.heroSecondImageAlt || ''} width="1150" height="1280" loading="lazy" decoding="async" /></div>
      <div className="lordina-ritual__copy">
        {home.heroSecondKicker ? <p className="lordina-hero__eyebrow">{home.heroSecondKicker}</p> : null}
        {home.heroSecondTitle ? <h2 id="lordina-ritual-title">{home.heroSecondTitle}</h2> : null}
        {home.heroSecondText ? <p>{home.heroSecondText}</p> : null}
        <OrderButton item={cream} products={products} shop={shop} label={home.heroSecondAction || 'Order now'} className="lordina-ritual__link" />
      </div>
    </section> : null}
  </>
}
