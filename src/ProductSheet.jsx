import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Minus, PackageCheck, Plus, ShoppingBag, Tag, X } from 'lucide-react'
import { ArrowNext, groupPriceLabel, ICON, ProductVisual, Stars, useSite } from './storefront'
import { ReviewForm } from './InfoPages'
import { canBuy, formatGhs, lineLabel } from './cloud/site.js'

const MAX = 20

// Product details: opens when a product is tapped anywhere on the site (address gets ?product=id).
// `product` is the product with all its sizes; `item` is the size being looked at (what goes in the cart).
export default function ProductSheet() {
  const { product, products, groups, cart, add, openCart, openProduct, closeProduct, reviews, ratings, content } = useSite()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(0)
  const [sizeId, setSizeId] = useState('')
  const [photo, setPhoto] = useState(0)
  const dialog = useRef(null)
  const open = Boolean(product)
  const sizeItems = product ? product.sizes.map((size) => products.find((candidate) => candidate.id === size.id)).filter(Boolean) : []
  const item = sizeItems.find((candidate) => candidate.id === sizeId) || sizeItems.find(canBuy) || sizeItems[0] || null
  const inCart = item ? cart[item.id] || 0 : 0
  const room = Math.max(0, MAX - inCart)
  const buyable = item ? canBuy(item) : false
  const photos = product?.images?.length ? product.images : product?.image ? [product.image] : []
  // Photos first, then videos; `photo` is the position in this list.
  const media = [...photos.map((src) => ({ kind: 'photo', src })), ...(product?.videos || []).map((src) => ({ kind: 'video', src }))]
  const shown = media[photo] || media[0]

  // New product: start again at 1 on its first photo, scroll to the top, focus the close button.
  useEffect(() => {
    setQty(1)
    setAdded(0)
    setPhoto(0)
    // Opened from a link to one size (?product=<size id>): start on that size.
    const wanted = new URLSearchParams(window.location.search).get('product')
    setSizeId(product?.sizes.some((size) => size.id === wanted) ? wanted : '')
    if (!product) return undefined
    dialog.current?.scrollTo?.({ top: 0 })
    const timer = setTimeout(() => dialog.current?.querySelector('.sheet-close')?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(timer)
  }, [product?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') closeProduct() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [open, closeProduct])

  useEffect(() => {
    if (!added) return undefined
    const timer = setTimeout(() => setAdded(0), 4000)
    return () => clearTimeout(timer)
  }, [added])

  if (!product || !item) return <div className="product-sheet" aria-hidden="true" />

  const chosen = Math.min(qty, room || 1)
  const related = groups.filter((other) => other.id !== product.id && product.category && other.category === product.category).slice(0, 3)
  const status = !item.inStock ? 'Out of stock' : !item.price ? 'Price on request' : 'In stock'
  const many = sizeItems.length > 1

  const addToCart = () => { add(item, chosen); setAdded(chosen); setQty(1) }
  const buyNow = () => { add(item, chosen); closeProduct(); openCart(0) }

  return <div className="product-sheet open">
    <button className="sheet-backdrop" onClick={closeProduct} aria-label="Close product" tabIndex={-1} />
    <div ref={dialog} className="sheet-card" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button className="sheet-close" onClick={closeProduct} aria-label="Close"><X {...ICON} /></button>
      <div className="sheet-art">
        {shown?.kind === 'video'
          ? <div className="product-visual sheet-video"><video key={shown.src} src={shown.src} controls playsInline preload="metadata" /></div>
          : <ProductVisual product={{ ...product, image: shown?.src || '' }} />}
        {media.length > 1 ? <div className="sheet-thumbs" role="group" aria-label="Photos and videos">{media.map((entry, index) => <button key={entry.src + index} className={`${index === photo ? 'on' : ''} ${entry.kind}`} onClick={() => setPhoto(index)} aria-label={`${entry.kind === 'video' ? 'Video' : 'Photo'} ${index + 1} of ${media.length}`} aria-pressed={index === photo}>
          {entry.kind === 'video' ? <><video src={entry.src} muted playsInline preload="metadata" /><span className="sheet-thumb-play" aria-hidden="true">▶</span></> : <img src={entry.src} alt="" loading="lazy" />}
        </button>)}</div> : null}
      </div>
      <div className="sheet-info">
        <span className="eyebrow">{[lineLabel(content.lines, product.line), product.category].filter(Boolean).join(' · ')}</span>
        <h2 id="sheet-title">{product.name}</h2>
        {ratings[product.id] ? <Stars rating={ratings[product.id].average} count={ratings[product.id].count} /> : null}
        {product.type ? <p className="sheet-type">{product.type}</p> : null}
        <p className="sheet-price">{item.price ? formatGhs(item.price) : 'Price on request'}</p>
        {many ? <div className="sheet-sizes" role="radiogroup" aria-label="Size">
          <span>Size</span>
          <div>{sizeItems.map((option) => <button key={option.id} role="radio" aria-checked={option.id === item.id} className={`${option.id === item.id ? 'on' : ''} ${canBuy(option) ? '' : 'unavailable'}`} onClick={() => { setSizeId(option.id); setQty(1) }}>
            <b>{option.size || 'Standard'}</b><small>{option.price ? formatGhs(option.price) : 'Ask us'}{option.inStock ? '' : ' · out of stock'}</small>
          </button>)}</div>
        </div> : null}
        {product.description ? <p className="sheet-desc">{product.description}</p> : null}

        <ul className="sheet-facts">
          {item.size && !many ? <li><Tag {...ICON} /> <span>Size</span><b>{item.size}</b></li> : null}
          <li><PackageCheck {...ICON} /> <span>Availability</span><b className={buyable ? 'ok' : ''}>{status}</b></li>
          {inCart ? <li><ShoppingBag {...ICON} /> <span>In your cart</span><b>{inCart}</b></li> : null}
        </ul>

        {buyable ? <div className="sheet-buy">
          <div className="sheet-qty">
            <span id="qty-label">Quantity</span>
            <div className="qty big" role="group" aria-labelledby="qty-label">
              <button onClick={() => setQty(Math.max(1, chosen - 1))} disabled={chosen <= 1} aria-label="One less"><Minus {...ICON} /></button>
              <span aria-live="polite">{chosen}</span>
              <button onClick={() => setQty(Math.min(room, chosen + 1))} disabled={chosen >= room} aria-label="One more"><Plus {...ICON} /></button>
            </div>
            <b className="sheet-line-total">{formatGhs(item.price * chosen)}</b>
          </div>
          {room ? <div className="sheet-actions">
            <button className="button dark" onClick={addToCart}>Add to Cart <ShoppingBag {...ICON} /></button>
            <button className="button sheet-buy-now" onClick={buyNow}>Buy now <ArrowNext /></button>
          </div> : <p className="sheet-note">You have the most we allow in one order ({MAX}).</p>}
          <div className={`sheet-added ${added ? 'show' : ''}`} role="status" aria-live="polite">
            {added ? <><Check {...ICON} /> <span>Added {added} to your cart.</span><button onClick={() => { closeProduct(); openCart(0) }}>View cart</button></> : null}
          </div>
        </div> : <p className="sheet-note">{!item.inStock ? 'This product is out of stock right now. Please check again soon.' : 'Contact us for the price of this product.'}</p>}

        {product.cautions ? <div className="sheet-cautions" role="note"><CircleAlert {...ICON} /><div><b>Before you use it</b>{product.cautions.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div></div> : null}
        {product.howToUse ? <details className="sheet-section" open><summary>How to use</summary><ol>{product.howToUse.split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}</ol></details> : null}
        {product.ingredientList ? <details className="sheet-section"><summary>Ingredients</summary><p>{product.ingredientList}</p></details> : null}

        {/* Approved reviews of this product, and a form; new reviews wait for the owner's approval. */}
        <details className="sheet-section sheet-reviews">
          <summary>Reviews{ratings[product.id] ? ` (${ratings[product.id].count})` : ''}</summary>
          {reviews.filter((review) => review.productId === product.id).slice(0, 5).map((review) => <blockquote key={review.id}><span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}</span> “{review.text}” <cite>— {review.name}{review.location ? `, ${review.location}` : ''}</cite></blockquote>)}
          <ReviewForm key={product.id} productId={product.id} />
        </details>

        {related.length ? <div className="sheet-related">
          <b>More {product.category.toLowerCase()}</b>
          <ul>{related.map((other) => <li key={other.id}><button onClick={() => openProduct(other.id)}>
            <span className="related-art"><ProductVisual product={other} /></span>
            <span><small>{other.category}</small>{other.name}<em>{groupPriceLabel(other)}</em></span>
          </button></li>)}</ul>
        </div> : null}
      </div>
    </div>
  </div>
}
