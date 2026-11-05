import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { flyToCart, groupPriceLabel, ICON, orderLink, ProductVisual, SiteFooter, SiteHeader, Stars, useMenuCategories, useSite, WishButton } from './storefront'
import { canBuy, formatGhs, LINES } from './cloud/site.js'
import { findRangeProduct } from './LordinaCollection'

// The shop: the Lordina shelf, a sticky bar of categories, search and sort, the product grid and the daily
// ritual. Every filter lives in the address so a filtered page can be shared. Until the owner adds products,
// the page shows the Lordina range from the home page without prices.
const EMPTY = { category: '', line: '', need: '', ingredient: '', best: '', q: '', sort: '' }
const SORTS = [{ id: '', label: 'Featured' }, { id: 'price-asc', label: 'Price: low to high' }, { id: 'price-desc', label: 'Price: high to low' }, { id: 'name', label: 'Name' }]
const PREVIEW_CATEGORY = { face: 'Face care', body: 'Body care' }

// The order Lordina is used in. Step words follow the packaging.
const RITUALS = [
  { id: 'morning', label: 'Morning', steps: [['serum', 'A few drops on clean skin'], ['cream', 'Smooth over the face'], ['day', 'All over the body']] },
  { id: 'evening', label: 'Evening', steps: [['serum', 'A few drops on clean skin'], ['cream', 'Smooth over the face'], ['night', 'All over the body'], ['oil', 'On damp skin after a bath']] },
]

function startFilters() {
  const params = new URLSearchParams(window.location.search)
  const pick = (value, allowed) => (allowed.includes(value) ? value : '')
  const any = (key) => String(params.get(key) || '').slice(0, 40)
  return {
    // Categories, needs and ingredients are the owner's and may load after this runs; any name filters, an
    // unknown one finds nothing.
    category: any('category'),
    line: pick(params.get('line'), LINES.map((line) => line.id)),
    need: any('need'),
    ingredient: any('ingredient'),
    best: params.get('best') === '1' ? '1' : '',
    q: String(params.get('q') || '').slice(0, 60),
    sort: pick(params.get('sort'), SORTS.map((sort) => sort.id)),
  }
}

// Counts that would leave one card alone on the last row make the first card a large feature instead:
// 4 columns on a computer (5, 9, ...), 2 on a phone (any odd count).
const gridClass = (n) => ['ln-grid', n > 1 && (n - 1) % 4 === 0 ? 'ln-grid--feature-4' : '', n > 1 && n % 2 === 1 ? 'ln-grid--feature-2' : ''].filter(Boolean).join(' ')

// A catalogue product as a card; its small tag is its category, or its use from the Lordina range.
function cardItem(group, range) {
  const match = range.find((item) => findRangeProduct(item, [group]))
  return { key: group.id, group, name: group.name, size: group.sizes.length > 1 ? '' : group.size, image: group.image, tag: group.category || match?.use || '', text: group.type, category: group.category }
}

// One card for both a catalogue product and a range preview item (no product yet: no price, no cart).
function ShopCard({ item, index, onAdded }) {
  const { cart, add, openProduct, ratings, products, content } = useSite()
  const { group } = item
  const many = group ? group.sizes.length > 1 : false
  const single = group && !many ? products.find((product) => product.id === group.sizes[0]?.id) : null
  const buyable = canBuy(single)
  const inCart = single ? cart[single.id] || 0 : 0
  const rating = group ? ratings[group.id] : null
  const open = group ? () => openProduct(group.id) : null
  const addOne = (event) => {
    add(single)
    flyToCart(event.currentTarget.closest('.ln-card')?.querySelector('.ln-card__art'))
    onAdded?.(single)
  }
  const ask = group ? null : orderLink(content.shop, `Hello Lordnoble, I would like to know about ${item.name}${item.size ? ` (${item.size})` : ''}.`)
  const price = !group ? 'Price coming soon' : !group.inStock ? 'Out of stock' : groupPriceLabel(group)

  return <article className="ln-card" id={`card-${item.key}`} style={{ '--i': index }}>
    <div className="ln-card__art">
      {open ? <button className="ln-card__open" onClick={open} aria-label={`See details for ${item.name}`}><ProductVisual product={group} /></button>
        : <img src={item.image} alt={`${item.name} with its box`} loading="lazy" decoding="async" />}
      {item.tag ? <span className="ln-card__tag">{item.tag}</span> : null}
      {group?.bestSeller ? <span className="ln-card__badge">Best seller</span> : null}
      {group ? <WishButton id={group.id} name={item.name} className="ln-card__wish" /> : null}
      {buyable ? <button className={`ln-card__add ${inCart ? 'in' : ''}`} onClick={addOne} aria-label={`Add ${item.name} to cart`}><Plus {...ICON} /><span>{inCart ? `In cart · ${inCart}` : 'Add to cart'}</span></button>
        : many && group.inStock ? <button className="ln-card__add" onClick={open}><Plus {...ICON} /><span>Choose size</span></button> : null}
    </div>
    <div className="ln-card__copy">
      <h3>{open ? <button onClick={open}>{item.name}</button> : item.name}</h3>
      <p className="ln-card__meta">{[item.size, many ? `${group.sizes.length} sizes` : '', item.text].filter(Boolean).join(' · ')}</p>
      {rating ? <Stars rating={rating.average} count={rating.count} /> : null}
      <p className={`ln-card__price ${group && group.inStock ? '' : 'is-quiet'}`}>{price}</p>
      {ask && ask !== '/contact' ? <a className="ln-card__ask" href={ask} target={ask.startsWith('http') ? '_blank' : undefined} rel="noreferrer">Ask about it</a> : null}
    </div>
  </article>
}

// Morning and evening, step by step. Once every step is a product with a price, the whole ritual goes in the cart.
function Ritual({ range, groups, onAdded }) {
  const { products, add } = useSite()
  const [pick, setPick] = useState('evening')
  const ritual = RITUALS.find((entry) => entry.id === pick)
  const steps = ritual.steps.map(([key, how]) => {
    const item = range.find((entry) => entry.key === key)
    if (!item) return null
    const group = findRangeProduct(item, groups)
    const single = group && group.sizes.length === 1 ? products.find((product) => product.id === group.sizes[0].id) : null
    return { key, how, item, single }
  }).filter(Boolean)
  if (steps.length < 2) return null
  const buyable = steps.every((step) => canBuy(step.single))
  const total = buyable ? steps.reduce((sum, step) => sum + step.single.price, 0) : 0
  const addAll = (event) => {
    steps.forEach((step) => add(step.single))
    flyToCart(event.currentTarget.closest('.ln-ritual')?.querySelector('.ln-ritual__step img')?.parentElement)
    onAdded?.({ name: `The ${ritual.label.toLowerCase()} ritual` })
  }

  return <section className="ln-ritual" aria-labelledby="ln-ritual-title">
    <div className="ln-ritual__head">
      <span className="ln-kicker">How to use Lordina</span>
      <h2 id="ln-ritual-title">Your daily ritual</h2>
      <div className="ln-ritual__switch" role="tablist" aria-label="Time of day">
        {RITUALS.map((entry) => <button key={entry.id} role="tab" aria-selected={entry.id === pick} className={entry.id === pick ? 'on' : ''} onClick={() => setPick(entry.id)}>{entry.label}</button>)}
      </div>
    </div>
    <ol className="ln-ritual__steps" key={pick} role="tabpanel" aria-label={`${ritual.label} ritual`} style={{ '--n': steps.length }}>
      {steps.map((step, index) => <li key={step.key} className="ln-ritual__step" style={{ '--i': index }}>
        <span className="ln-ritual__img"><img src={step.item.image} alt="" loading="lazy" decoding="async" /></span>
        <span className="ln-ritual__num">Step {index + 1}</span>
        <b>{step.item.name}</b>
        <small>{step.how}</small>
      </li>)}
    </ol>
    {buyable ? <button className="ln-btn ln-btn--foil ln-ritual__add" onClick={addAll}><Plus {...ICON} /> Add the {ritual.label.toLowerCase()} ritual · {formatGhs(total)}</button> : null}
  </section>
}

export default function ShopPage() {
  const { content, groups: products, openCart, openProduct, loaded } = useSite()
  const categories = useMenuCategories()
  const [filters, setFilters] = useState(startFilters)
  const [justAdded, setJustAdded] = useState(null)
  const range = useMemo(() => (content.home.range || []).filter((item) => item.show !== false), [content.home.range])
  const preview = loaded && !products.length

  // Catalogue products once the owner has added them; until then the Lordina range, without prices.
  const items = useMemo(() => (preview
    ? range.map((item) => ({ key: item.key, group: null, name: item.name, size: item.size, image: item.image, tag: item.use, text: '', category: PREVIEW_CATEGORY[item.group] || '' }))
    : products.map((group) => cardItem(group, range))), [preview, range, products])

  const needle = filters.q.trim().toLowerCase()
  const visible = useMemo(() => {
    const found = items.filter(({ group, ...item }) =>
      (!filters.category || item.category === filters.category) &&
      (!filters.line || group?.line === filters.line) &&
      (!filters.need || group?.needs?.includes(filters.need)) &&
      (!filters.ingredient || group?.ingredients?.includes(filters.ingredient)) &&
      (!filters.best || group?.bestSeller) &&
      (!needle || `${item.name} ${item.tag} ${item.category} ${group?.brand || ''} ${group?.type || ''} ${group?.description || ''}`.toLowerCase().includes(needle)))
    const price = (item) => item.group?.price ?? Infinity
    if (filters.sort === 'price-asc') return [...found].sort((a, b) => price(a) - price(b))
    if (filters.sort === 'price-desc') return [...found].sort((a, b) => (b.group?.price ?? -1) - (a.group?.price ?? -1))
    if (filters.sort === 'name') return [...found].sort((a, b) => a.name.localeCompare(b.name))
    return found
  }, [items, filters, needle])

  const count = (test) => products.filter(test).length
  const needs = content.tags.needs.filter((need) => count((product) => product.needs?.includes(need.label)))
  const ingredients = content.tags.ingredients.filter((id) => count((product) => product.ingredients?.includes(id)))
  const lines = content.lines.filter((line) => count((product) => product.line === line.id))
  const tabs = preview ? [...new Set(items.map((item) => item.category).filter(Boolean))] : categories.map((category) => category.name)
  const { pages } = content

  useEffect(() => { document.title = 'Shop Lordina — Lordnoble Cosmetics' }, [])
  // The header's search icon links to /shop#search: put the cursor straight in the search box.
  useEffect(() => {
    if (window.location.hash !== '#search') return
    const input = document.getElementById('shop-search')
    input?.focus({ preventScroll: true })
    input?.scrollIntoView({ block: 'center' })
  }, [])
  useEffect(() => {
    if (!justAdded) return undefined
    const timer = setTimeout(() => setJustAdded(null), 3500)
    return () => clearTimeout(timer)
  }, [justAdded])

  const choose = (next) => {
    const value = { ...filters, ...next }
    setFilters(value)
    const url = new URL(window.location.href)
    for (const key of Object.keys(EMPTY)) {
      if (value[key]) url.searchParams.set(key, value[key])
      else url.searchParams.delete(key)
    }
    window.history.replaceState(null, '', url)
  }
  const toggle = (key, value) => choose({ [key]: filters[key] === value ? '' : value })
  const chip = (key, value, label = value) => <button key={value} className={filters[key] === value ? 'on' : ''} aria-pressed={filters[key] === value} onClick={() => toggle(key, value)}>{label}</button>
  const anyFilter = Object.entries(filters).some(([key, value]) => key !== 'sort' && value)
  const title = pages.shopTitle && pages.shopTitle !== 'Shop' ? <>{pages.shopTitle}{pages.shopAccent ? <> <em>{pages.shopAccent}</em></> : null}</> : <>Shop <em>Lordina</em></>

  // The shelf: each bottle opens its product, or jumps to its card.
  const shelfClick = (item) => {
    const group = findRangeProduct(item, products)
    if (group) { openProduct(group.id); return }
    const card = document.getElementById(`card-${item.key}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card?.classList.remove('is-pointed')
    requestAnimationFrame(() => card?.classList.add('is-pointed'))
  }

  return <main className="shop ln-shop">
    <SiteHeader dark={false} />

    <section className="ln-shop-hero" aria-labelledby="shop-title">
      <div className="ln-shop-hero__copy">
        <span className="ln-kicker">{pages.shopKicker || 'Face and body care'}</span>
        <h1 id="shop-title">{title}</h1>
        <p>{preview ? `${items.length} products. Prices are on the way.` : `${items.length} ${items.length === 1 ? 'product' : 'products'}, delivered to your door.`}</p>
      </div>
      {range.length ? <ul className="ln-shelf" aria-label="The Lordina range">
        {range.map((item, index) => <li key={item.key} style={{ '--i': index }}>
          <button onClick={() => shelfClick(item)} aria-label={item.name}><img src={item.image} alt="" decoding="async" fetchPriority={index < 2 ? 'high' : undefined} /></button>
        </li>)}
      </ul> : null}
    </section>

    <div className="ln-bar">
      <div className="ln-bar__inner">
        <div className="ln-tabs" role="group" aria-label="Category">
          <button className={!filters.category && !filters.best ? 'on' : ''} onClick={() => choose({ category: '', best: '' })}>All</button>
          {count((product) => product.bestSeller) ? chip('best', '1', 'Best sellers') : null}
          {tabs.map((name) => chip('category', name))}
        </div>
        <div className="ln-bar__tools">
          <form className="ln-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <Search {...ICON} />
            <label htmlFor="shop-search" className="visually-hidden">Search products</label>
            <input id="shop-search" type="search" value={filters.q} onChange={(event) => choose({ q: event.target.value.slice(0, 60) })} placeholder="Search" autoComplete="off" enterKeyHint="search" />
          </form>
          {preview ? null : <label className="ln-sort"><span className="visually-hidden">Sort by</span>
            <select value={filters.sort} onChange={(event) => choose({ sort: event.target.value })}>{SORTS.map((sort) => <option key={sort.id} value={sort.id}>{sort.label}</option>)}</select>
          </label>}
        </div>
      </div>
      {lines.length > 1 || needs.length || ingredients.length ? <details className="ln-more">
        <summary>More filters</summary>
        {lines.length > 1 ? <div className="ln-tabs" role="group" aria-label="Shop path"><span>Path</span>{lines.map((line) => chip('line', line.id, line.label))}</div> : null}
        {needs.length ? <div className="ln-tabs" role="group" aria-label="Need"><span>Need</span>{needs.map((need) => chip('need', need.label))}</div> : null}
        {ingredients.length ? <div className="ln-tabs" role="group" aria-label="Ingredient"><span>Ingredient</span>{ingredients.map((id) => chip('ingredient', id))}</div> : null}
      </details> : null}
    </div>

    <section className="ln-grid-wrap" aria-label="Products">
      <p className="ln-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'product' : 'products'}{anyFilter ? <button onClick={() => choose({ ...EMPTY, sort: filters.sort })}><X {...ICON} /> Clear filters</button> : null}</p>
      {visible.length ? <div className={gridClass(visible.length)}>{visible.map((item, index) => <ShopCard key={item.key} item={item} index={index} onAdded={setJustAdded} />)}</div>
        : !loaded ? <p className="ln-empty">Loading the products…</p>
          : <div className="ln-empty"><p>Nothing matches “{filters.q || 'that'}”.</p><button className="ln-btn ln-btn--ghost" onClick={() => choose(EMPTY)}>Show all products</button></div>}
    </section>

    <Ritual range={range} groups={products} onAdded={setJustAdded} />

    <div className={`added-toast ${justAdded ? 'show' : ''}`} role="status" aria-live="polite">
      {justAdded ? <><span><b>{justAdded.name}</b> is in your cart.</span><button onClick={() => { setJustAdded(null); openCart() }}>View cart</button></> : null}
    </div>

    <SiteFooter />
  </main>
}

// The products a customer saved with the heart, kept in this browser.
export function WishlistPage() {
  const { content, wishlist, loaded, openCart } = useSite()
  const [justAdded, setJustAdded] = useState(null)
  const range = (content.home.range || []).filter((item) => item.show !== false)
  useEffect(() => { document.title = 'Wishlist — Lordnoble Cosmetics' }, [])
  useEffect(() => {
    if (!justAdded) return undefined
    const timer = setTimeout(() => setJustAdded(null), 3500)
    return () => clearTimeout(timer)
  }, [justAdded])

  return <main className="shop ln-shop">
    <SiteHeader dark={false} />
    <section className="ln-shop-hero ln-shop-hero--small" aria-labelledby="wish-title">
      <div className="ln-shop-hero__copy">
        <span className="ln-kicker">Saved for later</span>
        <h1 id="wish-title">Your <em>wishlist</em></h1>
        <p>{wishlist.length ? `${wishlist.length} saved ${wishlist.length === 1 ? 'product' : 'products'}. They stay on this phone or computer.` : 'Tap the heart on any product to save it here.'}</p>
      </div>
    </section>
    <section className="ln-grid-wrap" aria-label="Saved products">
      {wishlist.length ? <div className={gridClass(wishlist.length)}>{wishlist.map((group, index) => <ShopCard key={group.id} item={cardItem(group, range)} index={index} onAdded={setJustAdded} />)}</div>
        : <div className="ln-empty"><p>{loaded ? 'Nothing saved yet.' : 'Loading…'}</p>{loaded ? <a className="ln-btn" href="/shop">Browse the shop</a> : null}</div>}
    </section>
    <div className={`added-toast ${justAdded ? 'show' : ''}`} role="status" aria-live="polite">
      {justAdded ? <><span><b>{justAdded.name}</b> is in your cart.</span><button onClick={() => { setJustAdded(null); openCart() }}>View cart</button></> : null}
    </div>
    <SiteFooter />
  </main>
}
