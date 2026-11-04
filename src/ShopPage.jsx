import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { ContactLinks, ICON, ProductCard, SiteFooter, SiteHeader, useMenuCategories, useSite } from './storefront'
import { LINES } from './cloud/site.js'
import LordinaCollection from './LordinaCollection'

// All products, with the owner's categories along the top, search, and shop path / need / ingredient filters.
// Every filter lives in the address so a filtered page can be shared.
const EMPTY = { category: '', line: '', need: '', ingredient: '', best: '', q: '' }

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
  }
}

export default function ShopPage() {
  const { content, groups: products, openCart, loaded } = useSite()
  const categories = useMenuCategories()
  const [filters, setFilters] = useState(startFilters)
  const [justAdded, setJustAdded] = useState(null)
  const needle = filters.q.trim().toLowerCase()
  const visible = useMemo(() => products.filter((product) =>
    (!filters.category || product.category === filters.category) &&
    (!filters.line || product.line === filters.line) &&
    (!filters.need || product.needs?.includes(filters.need)) &&
    (!filters.ingredient || product.ingredients?.includes(filters.ingredient)) &&
    (!filters.best || product.bestSeller) &&
    (!needle || `${product.name} ${product.brand} ${product.type} ${product.description} ${product.category}`.toLowerCase().includes(needle))), [products, filters, needle])
  const count = (test) => products.filter(test).length
  const needs = content.tags.needs.filter((need) => count((product) => product.needs?.includes(need.label)))
  const ingredients = content.tags.ingredients.filter((id) => count((product) => product.ingredients?.includes(id)))
  const lines = content.lines.filter((line) => count((product) => product.line === line.id))
  const { pages } = content

  useEffect(() => { document.title = window.location.pathname.startsWith('/checkout') ? 'Checkout — Lordnoble Cosmetics' : products.length ? 'Shop — Lordnoble Cosmetics' : 'Shop Lordina — Lordnoble Cosmetics' }, [products.length])
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
  const heading = filters.best ? 'Best Sellers' : filters.category || content.lines.find((line) => line.id === filters.line)?.label || filters.need || filters.ingredient || ''
  const chip = (key, value, label = value) => <button key={value} className={filters[key] === value ? 'active' : ''} aria-pressed={filters[key] === value} onClick={() => toggle(key, value)}>{label}</button>
  const anyFilter = Object.values(filters).some(Boolean)

  if (loaded && !products.length) return <main className="shop shop--preview">
    <SiteHeader />
    <LordinaCollection products={products} compact />
    <SiteFooter />
  </main>

  return <main className="shop">
    <SiteHeader />

    <section className="page-hero">
      <span className="kicker">{pages.shopKicker}</span>
      <h1>{heading || <>{pages.shopTitle} {pages.shopAccent ? <span className="gold">{pages.shopAccent}</span> : null}</>}</h1>
      <form className="shop-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <Search {...ICON} />
        <label htmlFor="shop-search" className="visually-hidden">Search products</label>
        <input id="shop-search" type="search" value={filters.q} onChange={(event) => choose({ q: event.target.value.slice(0, 60) })} placeholder="Search products" autoComplete="off" enterKeyHint="search" />
      </form>
    </section>

    <section className="section shop-body" aria-label="Products">
      <div className="shop-filters">
        <div className="chips" role="group" aria-label="Category">
          <button className={!filters.category && !filters.best ? 'active' : ''} onClick={() => choose({ category: '', best: '' })}>All</button>
          {count((product) => product.bestSeller) ? chip('best', '1', 'Best sellers') : null}
          {categories.map((category) => chip('category', category.name))}
        </div>
        {lines.length > 1 || needs.length || ingredients.length ? <details className="more-filters">
          <summary>More filters</summary>
          {lines.length > 1 ? <div className="chips" role="group" aria-label="Shop path"><span>Path</span>{lines.map((line) => chip('line', line.id, line.label))}</div> : null}
          {needs.length ? <div className="chips" role="group" aria-label="Need"><span>Need</span>{needs.map((need) => chip('need', need.label))}</div> : null}
          {ingredients.length ? <div className="chips" role="group" aria-label="Ingredient"><span>Ingredient</span>{ingredients.map((id) => chip('ingredient', id))}</div> : null}
        </details> : null}
        <p className="shop-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'product' : 'products'}{anyFilter ? <button onClick={() => choose(EMPTY)}><X {...ICON} /> Clear</button> : null}</p>
      </div>

      {visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} onAdded={setJustAdded} />)}</div>
        : !loaded ? <p className="shop-empty">Loading the products…</p>
          : products.length ? <div className="shop-empty"><p>Nothing matches just yet.</p><button className="btn-wine" onClick={() => choose(EMPTY)}>Show all products</button></div>
            : <div className="shop-empty"><p>Nothing is in the online shop yet. Message us to order.</p><div className="shop-empty__contact"><ContactLinks shop={content.shop} /></div></div>}
    </section>

    <div className={`added-toast ${justAdded ? 'show' : ''}`} role="status" aria-live="polite">
      {justAdded ? <><span><b>{justAdded.name}</b> is in your cart.</span><button onClick={() => { setJustAdded(null); openCart() }}>View cart</button></> : null}
    </div>

    <SiteFooter />
  </main>
}
