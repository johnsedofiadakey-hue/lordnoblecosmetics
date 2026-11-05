import { ArrowRight } from 'lucide-react'
import { ICON, pictureLink } from './storefront'
import { HERO_IMAGE } from './cloud/site.js'

export default function LordinaHero({ home }) {
  const image = pictureLink(home.heroImage) || HERO_IMAGE
  return <section className="lordina-hero" aria-labelledby="hero-title">
    <img className="lordina-hero__image" src={image} alt={home.heroImageAlt || ''} width="956" height="1280" fetchPriority="high" decoding="async" />
    <div className="lordina-hero__copy">
      <p className="lordina-hero__eyebrow">{home.heroKicker || 'The Lordina collection'}</p>
      <h1 id="hero-title">{home.heroTitle || 'Radiance, every day.'}{home.heroAccent ? ` ${home.heroAccent}` : ''}</h1>
      {home.heroText ? <p className="lordina-hero__text">{home.heroText}</p> : null}
      <a className="lordina-hero__link" href="#lordina-range">{home.heroAction || 'Explore the collection'} <ArrowRight {...ICON} /></a>
    </div>
  </section>
}

export function LordinaFeature({ home }) {
  const range = home.range || []
  const serum = range.find((item) => item.key === 'serum' && item.show !== false)
  const cream = range.find((item) => item.key === 'cream' && item.show !== false)
  if (!serum && !cream) return null
  return <section className="lordina-feature" aria-labelledby="lordina-feature-title">
    <div className="lordina-feature__products">
      {[serum, cream].filter(Boolean).map((item) => <img key={item.key} src={pictureLink(item.image)} alt={item.name} loading="lazy" decoding="async" />)}
    </div>
    <div className="lordina-feature__copy">
      {home.featureKicker ? <span>{home.featureKicker}</span> : null}
      <h2 id="lordina-feature-title">{home.featureTitle || 'Serum + cream.'}</h2>
      {home.featureText ? <p>{home.featureText}</p> : null}
      <a href="#lordina-range">{home.featureAction || 'View face care'} <ArrowRight {...ICON} /></a>
    </div>
  </section>
}

export function LordinaStory({ home }) {
  const image = pictureLink(home.heroSecondImage)
  if (!image) return null
  return <section className="lordina-story" aria-labelledby="lordina-story-title">
    <div className="lordina-story__photo"><img src={image} alt={home.heroSecondImageAlt || ''} width="1150" height="1280" decoding="async" /></div>
    <div className="lordina-story__copy">
      <span>{home.heroSecondKicker || 'A moment of care'}</span>
      <h2 id="lordina-story-title">{home.heroSecondTitle || 'Lordina Face Cream'}</h2>
      <p>{home.heroSecondText || 'Rich yet lightweight moisture for soft, smooth skin.'}</p>
      <a href="#lordina-range">{home.heroSecondAction || 'See all products'} <ArrowRight {...ICON} /></a>
    </div>
  </section>
}
