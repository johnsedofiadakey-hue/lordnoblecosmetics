import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, BadgeCheck, Brush, ChevronDown, Droplet, Flower, Flower2, Gem, Gift, Heart, Leaf, Mail, MapPin, Menu, MessageCircle, Phone, PersonStanding, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Smile, Sparkles, Star, Sun, Truck, X } from 'lucide-react'
import { canBuy, formatGhs, groupProducts, mergeCatalog, mergeContent, ratingsByProduct, socialLinks } from './cloud/site.js'

// Shared by every public page: website content (from the admin editor), the cart, header, footer and cart panel.

// Web icons (Lucide). Each sits in a span so CSS hooks (e.g. `.button span`) still apply.
export const ICON = { size: '1em', strokeWidth: 1.75, 'aria-hidden': true, focusable: false }
export function Arrow() { return <span className="icon-wrap" aria-hidden="true"><ArrowUpRight {...ICON} /></span> }
export function ArrowNext() { return <span className="icon-wrap" aria-hidden="true"><ArrowRight {...ICON} /></span> }
export function AddIcon() { return <Plus {...ICON} /> }

// The owner's icon choices (site.js ICON_CHOICES), drawn with Lucide.
const ICONS = { flower: Flower2, body: PersonStanding, face: Smile, leaf: Leaf, tools: Brush, drop: Droplet, sparkles: Sparkles, heart: Heart, gem: Gem, shield: ShieldCheck, truck: Truck, star: Star, gift: Gift, sun: Sun, lotus: Flower, bag: ShoppingBag }
export function SiteIcon({ name, strokeWidth = 1.4 }) {
  const Glyph = ICONS[name] || Flower2
  return <Glyph {...ICON} strokeWidth={strokeWidth} />
}

// Instagram, TikTok, Snapchat and Facebook marks (Lucide has no brand icons).
export function SocialIcon({ name }) {
  const common = { width: '1em', height: '1em', viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false }
  if (name === 'instagram') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></svg>
  if (name === 'snapchat') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3.2c3 0 5 2.2 5 5.1v2.4c.7.1 1.3-.4 1.9-.2.5.2.4.8-.1 1.1-.6.4-1.7.6-1.7 1.3.3 1.5 1.9 3.2 3.6 3.6.4.1.3.6-.1.8-.7.3-1.6.3-1.9.6-.2.4-.1 1.1-.6 1.2-.6.1-1.4-.3-2.4 0-.9.3-1.8 1.6-3.7 1.6s-2.8-1.3-3.7-1.6c-1-.3-1.8.1-2.4 0-.5-.1-.4-.8-.6-1.2-.3-.3-1.2-.3-1.9-.6-.4-.2-.5-.7-.1-.8 1.7-.4 3.3-2.1 3.6-3.6 0-.7-1.1-.9-1.7-1.3-.5-.3-.6-.9-.1-1.1.6-.2 1.2.3 1.9.2V8.3c0-2.9 2-5.1 5-5.1Z" /></svg>
  if (name === 'tiktok') return <svg {...common} fill="currentColor"><path d="M16.6 3c.4 2.2 1.8 3.7 4 3.9v3.2a7.4 7.4 0 0 1-4-1.2v6.2a5.9 5.9 0 1 1-5.9-5.9c.3 0 .7 0 1 .1v3.3a2.7 2.7 0 1 0 1.8 2.5V3h3.1Z" /></svg>
  return <svg {...common} fill="currentColor"><path d="M13.5 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" /></svg>
}

// Gold stars for an approved-review average (never shown without reviews).
export function Stars({ rating, count, size = 'small' }) {
  if (!count) return null
  const full = Math.round(rating)
  return <span className={`stars stars--${size}`} aria-label={`Rated ${rating} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
    <span aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <Star key={n} {...ICON} strokeWidth={1.4} className={n <= full ? 'on' : ''} />)}</span>
    <small>({count})</small>
  </span>
}

// The product's own photo, never a stand-in. Without a photo it shows the product's initials.
export function ProductVisual({ product, className = '' }) {
  const initials = String(product?.name || '').split(/\s+/).filter((word) => /^[a-z0-9]/i.test(word)).slice(0, 2).map((word) => word[0].toUpperCase()).join('')
  return <div className={`product-visual ${className}`} aria-hidden="true">
    {product?.image ? <img src={product.image} alt="" loading="lazy" decoding="async" /> : <span className="product-initials">{initials}</span>}
  </div>
}

// A copy of the product photo flies into the cart button, then the button gives a small bounce.
export function flyToCart(fromNode) {
  const target = document.querySelector('.cart-btn')
  if (!target) return
  const bump = () => target.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' })
  const image = fromNode?.querySelector?.('img')
  if (!image || !image.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { bump(); return }
  const from = image.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const ghost = image.cloneNode()
  Object.assign(ghost.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, margin: 0, padding: 0, objectFit: 'contain', zIndex: 80, pointerEvents: 'none', borderRadius: '14px', background: '#fff', boxShadow: '0 18px 40px -18px rgb(18 13 11 / .45)' })
  document.body.appendChild(ghost)
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(.42)`, opacity: 0.95, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0.3 },
  ], { duration: 760, easing: 'cubic-bezier(.55,0,.3,1)' }).onfinish = () => { ghost.remove(); bump() }
}

// The heart on a product: saved in this browser (no account needed).
export function WishButton({ id, name, className = '' }) {
  const { wished, toggleWish } = useSite()
  const on = wished(id)
  return <button type="button" className={`wish-btn ${on ? 'on' : ''} ${className}`} onClick={() => toggleWish(id)} aria-pressed={on} aria-label={on ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}>
    <Heart {...ICON} strokeWidth={1.6} />
  </button>
}

// The product card of the reference design: photo (with Best Seller badge), name, short line, price, stars,
// Add to Cart. Used on the home page.
// `product` is a product with its sizes (groupProducts). With one size, Add to Cart adds it; with several, the
// button opens the product so the customer picks a size first.
export function ProductCard({ product, onAdded }) {
  const { cart, add, openProduct, ratings, products } = useSite()
  const many = product.sizes.length > 1
  const single = many ? null : products.find((item) => item.id === product.sizes[0]?.id)
  const inCart = single ? cart[single.id] || 0 : 0
  const rating = ratings[product.id]
  return <article className="product-card">
    <button className="product-card__art" onClick={() => openProduct(product.id)} aria-label={`See details for ${product.name}`}>
      <ProductVisual product={product} />
      {product.bestSeller ? <span className="product-card__badge">Best Seller</span> : null}
    </button>
    <WishButton id={product.id} name={product.name} className="product-card__wish" />
    <div className="product-card__copy">
      <h3><button className="product-card__name" onClick={() => openProduct(product.id)}>{product.name}</button></h3>
      {product.type || product.size ? <p className="product-card__line">{product.type || product.size}{many ? ` · ${product.sizes.length} sizes` : ''}</p> : null}
      <b className="product-card__price">{groupPriceLabel(product)}</b>
      {rating ? <Stars rating={rating.average} count={rating.count} /> : null}
      {many ? <button className="product-card__add" onClick={() => openProduct(product.id)}><ShoppingCart {...ICON} /> Choose size</button>
        : <button className="product-card__add" disabled={!canBuy(single)} onClick={(event) => { add(single); flyToCart(event.currentTarget.closest('.product-card')?.querySelector('.product-card__art')); onAdded?.(single) }}><ShoppingCart {...ICON} /> {buyLabel(single || product, inCart)}</button>}
    </div>
  </article>
}

export function priceLabel(product) {
  return product.price ? formatGhs(product.price) : 'Price on request'
}

// "From GHS 250.00" when a product's sizes cost different amounts.
export function groupPriceLabel(group) {
  if (!group.price) return 'Price on request'
  return group.maxPrice && group.maxPrice !== group.price ? `From ${formatGhs(group.price)}` : formatGhs(group.price)
}

export function buyLabel(product, inCart = 0) {
  if (!product.inStock) return 'Out of stock'
  if (!product.price) return 'Ask us'
  return inCart ? `In cart (${inCart}) · Add more` : 'Add to Cart'
}

// ---- Content + cart --------------------------------------------------------------------------------

const SITE_CACHE = 'lordnoble-site'
const CART_KEY = 'lordnoble-cart'
const WISH_KEY = 'lordnoble-wishlist'

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: kept for this page only */ }
}

async function loadSite() {
  const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore/lite'), import('./cloud/firebase.js')])
  const { collection, getDocs, query, where } = await import('firebase/firestore/lite')
  const [content, catalog, availability, reviews] = await Promise.all([
    getDoc(doc(db, 'site', 'content')),
    getDoc(doc(db, 'site', 'catalog')),
    getDoc(doc(db, 'site', 'availability')),
    // Only approved reviews are readable (firestore.rules); an error here never stops the shop loading.
    getDocs(query(collection(db, 'reviews'), where('status', '==', 'approved'))).catch(() => null),
  ])
  return {
    content: content.exists() ? content.data() : null,
    catalog: catalog.exists() ? catalog.data() : null,
    availability: availability.exists() ? availability.data() : null,
    reviews: reviews ? reviews.docs.map((d) => {
      const data = d.data()
      return { id: d.id, name: data.name, location: data.location, text: data.text, rating: data.rating, productId: data.productId, status: data.status, createdAt: data.createdAt?.seconds || 0 }
    }).sort((a, b) => b.createdAt - a.createdAt) : [],
  }
}

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  // Show the last saved content straight away, then refresh it from the database.
  const [saved, setSaved] = useState(() => readJson(SITE_CACHE) || { content: null, catalog: null, availability: null })
  const [loaded, setLoaded] = useState(false)
  const [cart, setCart] = useState(() => {
    const stored = readJson(CART_KEY)
    return stored && typeof stored === 'object' ? stored : {}
  })
  // The cart slides in from the side; paying happens on the /checkout page.
  const [cartOpen, setCartOpen] = useState(false)
  // Saved products (product ids), newest first.
  const [wishlist, setWishlist] = useState(() => {
    const stored = readJson(WISH_KEY)
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string').slice(0, 60) : []
  })
  // The product being looked at, kept in the address (?product=id) so it can be shared and Back closes it.
  const [productId, setProductId] = useState(() => new URLSearchParams(window.location.search).get('product'))

  useEffect(() => {
    let live = true
    loadSite()
      .then((next) => { if (live) { setSaved(next); writeJson(SITE_CACHE, next) } })
      .catch(() => { /* offline or blocked: keep what we have */ })
      .finally(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])
  useEffect(() => { writeJson(CART_KEY, cart) }, [cart])
  useEffect(() => { writeJson(WISH_KEY, wishlist) }, [wishlist])
  useEffect(() => {
    const onPop = () => setProductId(new URLSearchParams(window.location.search).get('product'))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const content = useMemo(() => mergeContent(saved.content), [saved.content])
  const products = useMemo(() => {
    const stockAvailability = saved.availability?.products || {}
    return mergeCatalog(saved.catalog).map((product) => (
      // The stock system's flag wins once a product has stock records.
      Object.prototype.hasOwnProperty.call(stockAvailability, product.id)
        ? { ...product, inStock: stockAvailability[product.id] === true }
        : product
    ))
  }, [saved.catalog, saved.availability])
  const shown = useMemo(() => products.filter((product) => product.visible), [products])
  // The same products with their sizes together, for everything customers browse.
  const groups = useMemo(() => groupProducts(shown), [shown])

  // Only products that can still be bought count; a product that went out of stock drops out of the bag.
  const count = shown.reduce((sum, product) => sum + (canBuy(product) ? cart[product.id] || 0 : 0), 0)
  const setQty = useCallback((id, qty) => setCart((items) => {
    const next = { ...items }
    if (qty > 0) next[id] = Math.min(20, qty)
    else delete next[id]
    return next
  }), [])
  const add = useCallback((product, qty = 1) => {
    if (!canBuy(product)) return
    setCart((items) => ({ ...items, [product.id]: Math.min(20, (items[product.id] || 0) + qty) }))
  }, [])
  const clear = useCallback(() => setCart({}), [])
  const toggleWish = useCallback((id) => setWishlist((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids].slice(0, 60))), [])
  const wished = useCallback((id) => wishlist.includes(id), [wishlist])
  // Only saved products that are still on the website.
  const wishGroups = useMemo(() => wishlist.map((id) => groups.find((group) => group.id === id)).filter(Boolean), [wishlist, groups])

  const openProduct = useCallback((id) => {
    const url = new URL(window.location.href)
    url.searchParams.set('product', id)
    if (new URLSearchParams(window.location.search).get('product')) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setProductId(id)
  }, [])
  const closeProduct = useCallback(() => {
    if (!new URLSearchParams(window.location.search).get('product')) { setProductId(null); return }
    const url = new URL(window.location.href)
    url.searchParams.delete('product')
    window.history.replaceState(null, '', url)
    setProductId(null)
  }, [])

  const reviews = useMemo(() => saved.reviews || [], [saved.reviews])
  const ratings = useMemo(() => ratingsByProduct(reviews), [reviews])
  // A customer's review goes in as "pending"; the owner approves it before anyone sees it.
  const submitReview = useCallback(async (review) => {
    const [{ addDoc, collection, serverTimestamp }, { db }] = await Promise.all([import('firebase/firestore/lite'), import('./cloud/firebase.js')])
    await addDoc(collection(db, 'reviews'), { ...review, status: 'pending', source: 'customer', createdAt: serverTimestamp() })
  }, [])

  const value = {
    reviews, ratings, submitReview,
    content, products: shown, groups, cart, count, add, setQty, clear, loaded: loaded || Boolean(saved.catalog),
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    wishlist: wishGroups, toggleWish, wished,
    product: productId ? groups.find((group) => group.id === productId || group.sizes.some((size) => size.id === productId)) || null : null,
    openProduct, closeProduct,
  }
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)

// ---- Header and footer ----------------------------------------------------------------------

export function Wordmark() {
  return <span className="wordmark"><span className="wordmark__mark" aria-hidden="true">A</span><span className="wordmark__text"><span className="wordmark__main">Lordnoble</span><span className="wordmark__sub">Beauty</span></span></span>
}

// The logo in Admin → Website → Shop details; `onDark` picks the dark footer version.
export function Logo({ onDark = false }) {
  const { content } = useSite()
  const src = pictureLink(onDark ? content.brand.logoLight : content.brand.logoDark)
  return src ? <img className="brand-logo" src={src} alt={content.brand.logoAlt || 'Lordnoble Cosmetics'} decoding="async" /> : <Wordmark />
}

const TOPBAR_ICONS = [Truck, BadgeCheck, Heart]

function TopBar() {
  const { content } = useSite()
  const { shop, home } = content
  const messages = (home.topbar || []).map((text, i) => ({ text: String(text || '').trim(), Icon: TOPBAR_ICONS[i % TOPBAR_ICONS.length] })).filter((item) => item.text)
  const socials = socialLinks(shop)
  if (!messages.length && !socials.length) return null
  return <div className="topbar">
    <div className="topbar__inner">
      <ul className="topbar__messages">{messages.map(({ text, Icon }) => <li key={text}><Icon {...ICON} /> {text}</li>)}</ul>
      <div className="topbar__end">
        {socials.length ? <div className="topbar__social">{socials.map((item) => <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}><SocialIcon name={item.name} /></a>)}</div> : null}
        <span className="topbar__currency">GHS</span>
      </div>
    </div>
  </div>
}

// The categories the menu lists: the owner's categories that have products or a card photo.
export function useMenuCategories() {
  const { content, groups: products } = useSite()
  return useMemo(() => content.categories.filter((category) => category.image || products.some((product) => product.category === category.name)), [content.categories, products])
}

// Dark on every page, like the home page.
export function SiteHeader({ dark = true }) {
  const { count, openCart, content, groups: products, reviews, wishlist } = useSite()
  const categories = useMenuCategories()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const close = () => setMenuOpen(false)
  const hasContact = Boolean(content.shop.phone || content.shop.whatsapp || content.shop.email || content.shop.address || content.shop.hours)
  const shopLinks = [
    { href: '/shop', label: 'All products' },
    ...(products.some((product) => product.bestSeller) ? [{ href: '/shop?best=1', label: 'Best sellers' }] : []),
    ...content.lines.map((line) => ({ href: `/shop?line=${encodeURIComponent(line.id)}`, label: line.label })),
  ]
  const categoryLinks = categories.length ? categories.map((category) => ({ href: `/shop?category=${encodeURIComponent(category.name)}`, label: category.name })) : [{ href: '/shop', label: 'All products' }]
  const current = (href) => (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
  const dropdown = (label, href, links) => <div className="nav-drop">
    <a href={href} aria-current={current(href)}>{label} <ChevronDown {...ICON} /></a>
    <div className="nav-drop__menu">{links.map((link) => <a key={link.href + link.label} href={link.href}>{link.label}</a>)}</div>
  </div>
  // The menu is the owner's: order, names and which links show (Admin → Website → Layout and menu).
  const HREF = { home: '/', shop: '/shop', about: '/about', reviews: '/reviews', contact: '/contact' }
  const items = content.layout.menu.filter((item) => item.show &&
    (item.key !== 'categories' || categories.length) &&
    (item.key !== 'about' || content.about.text || content.about.image) &&
    (item.key !== 'reviews' || reviews.length) &&
    (item.key !== 'contact' || hasContact))
  const desktop = (item) => {
    if (item.key === 'shop') return products.length ? <span key={item.key}>{dropdown(item.label, '/shop', shopLinks)}</span> : <a key={item.key} href="/shop" aria-current={current('/shop')}>{item.label}</a>
    if (item.key === 'categories') return <span key={item.key}>{dropdown(item.label, '/shop', categoryLinks)}</span>
    return <a key={item.key} href={HREF[item.key]} aria-current={current(HREF[item.key])}>{item.label}</a>
  }
  const mobile = (item) => item.key === 'categories'
    ? categoryLinks.map((link) => <a key={`c-${link.label}`} className="sub" href={link.href} onClick={close}>{link.label}</a>)
    : <a key={item.key} href={HREF[item.key] || '/shop'} onClick={close}>{item.label}</a>
  const hasTopbar = (content.home.topbar || []).some((message) => String(message || '').trim()) || socialLinks(content.shop).length > 0
  return <div className={`site-top ${dark ? 'site-top--dark' : ''} ${!hasTopbar ? 'site-top--no-topbar' : ''} ${scrolled ? 'is-scrolled' : ''}`}>
    <TopBar />
    <header className="site-header">
      <a href="/" className="brand" aria-label="Lordnoble Cosmetics home"><Logo onDark={dark} /></a>
      <nav className="main-nav" aria-label="Main">{items.map(desktop)}</nav>
      <div className="header-actions">
        {products.length ? <a className="icon-btn" href="/shop#search" aria-label="Search products"><Search {...ICON} /></a> : null}
        {products.length ? <a className="icon-btn wish-link" href="/wishlist" aria-current={current('/wishlist')} aria-label={`Wishlist, ${wishlist.length} saved`}><Heart {...ICON} />{wishlist.length ? <span className="cart-count">{wishlist.length}</span> : null}</a> : null}
        {products.length || count ? <button className="icon-btn cart-btn" onClick={() => openCart()} aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}><ShoppingCart {...ICON} /><span className="cart-count">{count}</span></button> : null}
        <button className="icon-btn menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X {...ICON} /> : <Menu {...ICON} />}</button>
      </div>
      <div className={`mobile-nav ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen} inert={menuOpen ? undefined : true}>
        {items.map(mobile)}
      </div>
    </header>
  </div>
}

// Where a customer orders something that is not in the online catalogue yet: WhatsApp with the message typed
// for them, otherwise a phone call, otherwise the contact page.
export function orderLink(shop, message) {
  const chat = whatsappLink(shop?.whatsapp)
  if (chat) return `${chat}?text=${encodeURIComponent(message)}`
  const phone = String(shop?.phone || '').replace(/[^\d+]/g, '')
  return phone ? `tel:${phone}` : '/contact'
}

export const whatsappLink = (number) => {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.startsWith('0') ? `233${digits.slice(1)}` : digits}`
}

// Links typed into the admin editor: only web links, never javascript: or data: URLs.

// A plain "chat with us" button, the way most Ghanaian shoppers ask questions. Only when a WhatsApp number is set.
function WhatsAppButton({ number }) {
  const link = whatsappLink(number)
  if (!link) return null
  return <a className="whatsapp-button" href={link} target="_blank" rel="noreferrer"><MessageCircle {...ICON} /> <span>Chat on WhatsApp</span></a>
}

// Picture links typed into the editor: a web link or a path on this site, nothing else. During local
// development the Storage emulator's plain-http address is allowed too, so uploads can be checked.
const LOCAL_STORAGE_EMULATOR = /^http:\/\/127\.0\.0\.1:9199\/[^\s"'<>]+$/
export const pictureLink = (text) => {
  const value = String(text || '').trim()
  if (import.meta.env.DEV && LOCAL_STORAGE_EMULATOR.test(value)) return value
  return /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/i.test(value) ? value : null
}

export function ContactLinks({ shop }) {
  const wa = whatsappLink(shop.whatsapp)
  return <>
    {shop.phone ? <a href={`tel:${shop.phone.replace(/\s/g, '')}`}><Phone {...ICON} /> {shop.phone}</a> : null}
    {wa ? <a href={wa} target="_blank" rel="noreferrer"><MessageCircle {...ICON} /> WhatsApp</a> : null}
    {shop.email ? <a href={`mailto:${shop.email}`}><Mail {...ICON} /> {shop.email}</a> : null}
    {shop.address ? <span><MapPin {...ICON} /> {shop.address}</span> : null}
  </>
}

// Words that drift across the gold band at the top of the footer.
const FOOTER_BAND = ['Lordina', 'Face care', 'Body care', 'Glow every day', 'Lordnoble Cosmetics']

export function SiteFooter() {
  const { content, groups: products, reviews } = useSite()
  const categories = useMenuCategories()
  const { shop } = content
  const payOnline = Boolean(content.checkout?.paystackPublicKey)
  const hasContact = Boolean(shop.phone || shop.whatsapp || shop.email || shop.address || shop.hours)
  const socials = socialLinks(shop)
  const helpLinks = content.layout.menu.filter((item) => item.show && ((item.key === 'about' && (content.about.text || content.about.image)) || (item.key === 'reviews' && reviews.length) || (item.key === 'contact' && hasContact)))
  const band = [...FOOTER_BAND, ...FOOTER_BAND]
  return <footer className="site-footer ln-footer">
    <div className="ln-footer__band" aria-hidden="true">
      <div className="ln-footer__band-track">{[0, 1].map((copy) => <span key={copy}>{band.map((word, i) => <span key={`${word}-${i}`}>{word}<i>✦</i></span>)}</span>)}</div>
    </div>

    <div className="ln-footer__inner">
      <section className="ln-footer__hello" aria-labelledby="footer-hello">
        <span className="ln-kicker">{socials.length ? 'Follow the glow' : 'Lordnoble Cosmetics'}</span>
        <h2 id="footer-hello">Glow with <em>us.</em></h2>
        {content.pages.footerText ? <p>{content.pages.footerText}.</p> : null}
        {socials.length ? <ul className="ln-footer__socials">{socials.map((item) => <li key={item.name}>
          <a className={`ln-social ln-social--${item.name}`} href={item.href} target="_blank" rel="noreferrer">
            <span className="ln-social__icon"><SocialIcon name={item.name} /></span>
            <span className="ln-social__text"><b>{item.label}</b>{item.handle ? <small>{item.handle}</small> : null}</span>
            <ArrowNext />
          </a>
        </li>)}</ul> : <a className="ln-btn ln-btn--foil ln-footer__cta" href="/shop">Shop the range <ArrowNext /></a>}
      </section>

      <div className="ln-footer__cols">
        <nav className="ln-footer__col" aria-labelledby="footer-shop">
          <h2 id="footer-shop">Shop</h2>
          <a href="/shop">{products.length ? 'All products' : 'The Lordina range'}</a>
          {categories.slice(0, 6).map((category) => <a key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`}>{category.name}</a>)}
          <a href="/wishlist">Your wishlist</a>
        </nav>
        <nav className="ln-footer__col" aria-labelledby="footer-help">
          <h2 id="footer-help">Help</h2>
          {helpLinks.map((item) => <a key={item.key} href={`/${item.key}`}>{item.label}</a>)}
          {products.length ? <><a href="/terms#delivery-and-pickup">Delivery and pickup</a><a href="/terms#returns-and-refunds">Returns and refunds</a></> : null}
          <a href="/terms">Terms and conditions</a>
        </nav>
        {hasContact ? <div className="ln-footer__col ln-footer__contact">
          <h2>Talk to us</h2>
          <ContactLinks shop={shop} />
          {shop.hours ? <span>Open {shop.hours}</span> : null}
        </div> : null}
      </div>
    </div>

    <div className="ln-footer__word" aria-hidden="true"><span>Lordnoble</span></div>

    <WhatsAppButton number={shop.whatsapp} />
    <div className="ln-footer__bottom">
      <small>© {new Date().getFullYear()} {shop.legalName || 'Lordnoble Cosmetics'}{products.length ? '. Prices in Ghana cedis (GHS).' : '.'}</small>
      {/* Only claim online payment once a Paystack key is set; until then orders are paid on delivery or pickup. */}
      {products.length ? <small>{payOnline ? 'Pay safely with Paystack by mobile money or card' : 'Online payment is not open yet'}</small> : null}
      <span className="ln-footer__credits">
        <a href="https://stormglide.io" target="_blank" rel="noreferrer">Built by <b>Stormglide.io</b></a>
        <a href="/admin/">Staff login</a>
      </span>
    </div>
  </footer>
}
