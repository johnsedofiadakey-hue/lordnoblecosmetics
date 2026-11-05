import { useEffect, useMemo, useRef } from 'react'
import { Lock, Minus, Plus, Trash2, X } from 'lucide-react'
import { ArrowNext, ICON, ProductVisual, useSite } from './storefront'
import { formatGhs } from './cloud/site.js'
import { cartLines, orderTotals } from './cloud/orders.js'

// The cart, sliding in from the side on every page. Paying happens on the /checkout page.
export default function CartDrawer() {
  const { products, cart, setQty, cartOpen, closeCart, openProduct } = useSite()
  const lines = useMemo(() => cartLines(cart, products), [cart, products])
  const { subtotal } = orderTotals(lines, 'pickup', null)
  const items = lines.reduce((sum, line) => sum + line.qty, 0)
  const sheet = useRef(null)

  // Esc closes; the page behind does not scroll while the cart is open.
  useEffect(() => {
    if (!cartOpen) return undefined
    const onKey = (event) => { if (event.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => sheet.current?.querySelector('h2')?.focus({ preventScroll: true }), 380)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; clearTimeout(timer) }
  }, [cartOpen, closeCart])

  return <aside className={`shop-panel checkout-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen} inert={cartOpen ? undefined : true}>
    <button className="panel-backdrop" onClick={closeCart} aria-label="Close cart" tabIndex={-1} />
    <div ref={sheet} className="panel-sheet drawer-sheet" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <header className="cart-head">
        <h2 id="cart-title" tabIndex={-1}>Your cart{items ? <small>{items} {items === 1 ? 'item' : 'items'}</small> : null}</h2>
        <button className="drawer-icon" onClick={closeCart} aria-label="Close cart"><X {...ICON} /></button>
      </header>

      <div className="drawer-scroll">
        {lines.length ? <ul className="cart-lines">{lines.map((line) => {
          const product = products.find((item) => item.id === line.id)
          return <li className="cart-line" key={line.id}>
            <button className="cart-line-art" onClick={() => openProduct(line.id)} aria-label={`See ${line.name}`}><ProductVisual product={product} /></button>
            <div className="cart-line-info">
              {line.size ? <span className="eyebrow">{line.size}</span> : null}
              <b>{line.name}</b>
              <small>{formatGhs(line.price)} each</small>
              <div className="qty" role="group" aria-label={`Quantity of ${line.name}`}>
                <button onClick={() => setQty(line.id, line.qty - 1)} aria-label={line.qty === 1 ? 'Remove' : 'One less'}>{line.qty === 1 ? <Trash2 {...ICON} /> : <Minus {...ICON} />}</button>
                <span aria-live="polite">{line.qty}</span>
                <button onClick={() => setQty(line.id, line.qty + 1)} aria-label="One more" disabled={line.qty >= 20}><Plus {...ICON} /></button>
              </div>
            </div>
            <b className="cart-line-total">{formatGhs(line.lineTotal)}</b>
          </li>
        })}</ul> : <div className="cart-empty">
          <img src="/brand/lordnoble-mark-dark.png" alt="" width="355" height="369" />
          <p>Your cart is empty.</p>
          <a className="ln-btn" href="/shop">Go to the shop <ArrowNext /></a>
        </div>}
      </div>

      {lines.length ? <div className="drawer-foot">
        <div className="drawer-total"><span>Subtotal</span><b>{formatGhs(subtotal)}</b></div>
        <p className="drawer-note">Delivery is added at checkout.</p>
        <a className="ln-btn ln-btn--foil drawer-cta" href="/checkout"><Lock {...ICON} /> Checkout <ArrowNext /></a>
        <button className="drawer-link" onClick={closeCart}>Keep shopping</button>
      </div> : null}
    </div>
  </aside>
}
