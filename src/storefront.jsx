import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, BadgeCheck, Brush, ChevronDown, Droplet, Flower, Flower2, Gem, Gift, Heart, Leaf, Mail, MapPin, Menu, MessageCircle, Phone, PersonStanding, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Smile, Sparkles, Star, Sun, Truck, X } from 'lucide-react'
import { canBuy, formatGhs, groupProducts, mergeCatalog, mergeContent, ratingsByProduct } from './cloud/site.js'

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

// Instagram, TikTok and Facebook marks (Lucide has no brand icons).
export function SocialIcon({ name }) {
  const common = { width: '1em', height: '1em', viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false }
  if (name === 'instagram') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></svg>
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

// The product card of the reference design: photo (with Best Seller badge), name, short line, price, stars,
// Add to Cart. Used on the home page and the shop page.
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
    <div className="product-card__copy">
      <h3><button className="product-card__name" onClick={() => openProduct(product.id)}>{product.name}</button></h3>
      {product.type || product.size ? <p className="product-card__line">{product.type || product.size}{many ? ` · ${product.sizes.length} sizes` : ''}</p> : null}
      <b className="product-card__price">{groupPriceLabel(product)}</b>
      {rating ? <Stars rating={rating.average} count={rating.count} /> : null}
      {many ? <button className="product-card__add" onClick={() => openProduct(product.id)}><ShoppingCart {...ICON} /> Choose size</button>
        : <button className="product-card__add" disabled={!canBuy(single)} onClick={() => { add(single); onAdded?.(single) }}><ShoppingCart {...ICON} /> {buyLabel(single || product, inCart)}</button>}
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
  // Checkout slides in from the side: step 0 bag, 1 details, 2 review and pay, 3 done. /checkout opens it.
  const [checkout, setCheckout] = useState(() => ({ open: window.location.pathname.replace(/\/+$/, '') === '/checkout', step: 0 }))
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
    cartOpen: checkout.open, checkoutStep: checkout.step,
    openCart: (step = 0) => setCheckout({ open: true, step: Number.isInteger(step) ? step : 0 }),
    setCheckoutStep: (step) => setCheckout((state) => ({ ...state, step })),
    closeCart: () => setCheckout((state) => ({ open: false, step: state.step === 3 ? 0 : state.step })),
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
  const socials = ['instagram', 'tiktok', 'facebook'].map((name) => ({ name, href: webLink(shop[name]) })).filter((item) => item.href)
  if (!messages.length && !socials.length) return null
  return <div className="topbar">
    <div className="topbar__inner">
      <ul className="topbar__messages">{messages.map(({ text, Icon }) => <li key={text}><Icon {...ICON} /> {text}</li>)}</ul>
      <div className="topbar__end">
        {socials.length ? <div className="topbar__social">{socials.map((item) => <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}><SocialIcon name={item.name} /></a>)}</div> : null}
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
  const { count, openCart, content, groups: products, reviews } = useSite()
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
  const hasTopbar = (content.home.topbar || []).some((message) => String(message || '').trim()) || ['instagram', 'tiktok', 'facebook'].some((name) => webLink(content.shop[name]))
  return <div className={`site-top ${dark ? 'site-top--dark' : ''} ${!hasTopbar ? 'site-top--no-topbar' : ''} ${scrolled ? 'is-scrolled' : ''}`}>
    <TopBar />
    <header className="site-header">
      <a href="/" className="brand" aria-label="Lordnoble Cosmetics home"><Logo onDark={dark} /></a>
      <nav className="main-nav" aria-label="Main">{items.map(desktop)}</nav>
      <div className="header-actions">
        {products.length ? <a className="icon-btn" href="/shop#search" aria-label="Search products"><Search {...ICON} /></a> : null}
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
export const webLink = (text) => (/^https:\/\/[^\s"'<>]+$/i.test(String(text || '').trim()) ? String(text).trim() : null)

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

export function SiteFooter() {
  const { content, groups: products, reviews } = useSite()
  const categories = useMenuCategories()
  const { shop } = content
  const payOnline = Boolean(content.checkout?.paystackPublicKey)
  const hasContact = Boolean(shop.phone || shop.whatsapp || shop.email || shop.address || shop.hours)
  const socials = ['instagram', 'tiktok', 'facebook'].map((name) => ({ name, href: webLink(shop[name]) })).filter((item) => item.href)
  const hasAbout = Boolean(content.about.text || content.about.image)
  const hasHelp = Boolean(hasAbout || reviews.length || hasContact || products.length)
  return <footer className={`site-footer ${!hasHelp && !hasContact ? 'site-footer--preview' : ''}`}>
    <div className="footer-top">
      <div className="footer-brand">
        <a href="/" className="footer-logo" aria-label="Lordnoble Cosmetics home"><Logo onDark /></a>
        {content.pages.footerText ? <p>{content.pages.footerText}.</p> : null}
        {socials.length ? <div className="footer-social">{socials.map((item) => <a key={item.name} href={item.href} target="_blank" rel="noreferrer" aria-label={item.name}><SocialIcon name={item.name} /></a>)}</div> : null}
      </div>
      <nav className="footer-col" aria-labelledby="footer-shop">
        <h2 id="footer-shop">Shop</h2>
        <a href="/shop">{products.length ? 'All products' : 'The Lordina range'}</a>
        {categories.slice(0, 6).map((category) => <a key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`}>{category.name}</a>)}
      </nav>
      {hasHelp ? <nav className="footer-col" aria-labelledby="footer-help">
        <h2 id="footer-help">Help</h2>
        {content.layout.menu.filter((item) => item.show && ((item.key === 'about' && (content.about.text || content.about.image)) || (item.key === 'reviews' && reviews.length) || (item.key === 'contact' && hasContact))).map((item) => <a key={item.key} href={`/${item.key}`}>{item.label}</a>)}
        {products.length ? <><a href="/terms#delivery-and-pickup">Delivery and pickup</a><a href="/terms#returns-and-refunds">Returns and refunds</a><a href="/terms">Terms and conditions</a></> : null}
      </nav> : null}
      {hasContact ? <div className="footer-col footer-contact">
        <h2>Talk to us</h2>
        <ContactLinks shop={shop} />
        {shop.hours ? <span>Open {shop.hours}</span> : null}
      </div> : null}
    </div>
    {/* Only claim online payment once a Paystack key is set; until then orders are paid on delivery or pickup. */}
    {products.length ? <p className="footer-pay">{payOnline ? 'Pay safely with Paystack by mobile money or card' : 'Online payment is not open yet'}</p> : null}
    <WhatsAppButton number={shop.whatsapp} />
    <div className="footer-bottom">
      <small>© {new Date().getFullYear()} {shop.legalName || 'Lordnoble Cosmetics'}{products.length ? '. Prices in Ghana cedis (GHS).' : '.'}</small>
      <a className="footer-powered" href="https://stormglide.io" target="_blank" rel="noreferrer">Built by <b>Stormglide.io</b></a>
      <a className="footer-staff" href="/admin/">Staff login</a>
    </div>
  </footer>
}
