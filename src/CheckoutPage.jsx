import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, CircleAlert, Lock, MapPin, Minus, Plus, Store, Trash2, Truck } from 'lucide-react'
import { ArrowNext, ICON, Logo, ProductVisual, useSite } from './storefront'
import { formatGhs } from './cloud/site.js'
import { cartLines, checkDetails, orderRequest, orderTotals, PAYMENT, paystackReference, placeOrder, verifyPayment } from './cloud/orders.js'

// The checkout page: contact, delivery and payment on one page, beside the order summary. The server prices the
// basket and the order only exists once Paystack confirms the payment. Then the page turns into the receipt.

const DETAILS_KEY = 'lordnoble-checkout-details'
const EMPTY_DETAILS = { name: '', phone: '', email: '', method: 'delivery', address: '', notes: '' }

function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack did not load')))
    script.onerror = () => reject(new Error('Paystack did not load'))
    document.head.appendChild(script)
  })
}

function readDetails() {
  try { return { ...EMPTY_DETAILS, ...JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}'), notes: '' } } catch { return { ...EMPTY_DETAILS } }
}

function Field({ label, hint, error, children }) {
  return <label className={`co-field ${error ? 'has-error' : ''}`}>
    <span>{label}{hint ? <em>{hint}</em> : null}</span>
    {children}
    {error ? <small role="alert"><CircleAlert {...ICON} /> {error}</small> : null}
  </label>
}

function Step({ number, title, done, children }) {
  return <section className={`co-step ${done ? 'is-done' : ''}`} aria-labelledby={`co-step-${number}`}>
    <h2 id={`co-step-${number}`}><span className="co-step__num" aria-hidden="true">{done ? <Check {...ICON} /> : number}</span>{title}</h2>
    {children}
  </section>
}

// The basket beside the form (on phones it folds away under a bar with the total).
function Summary({ lines, totals, feeText, method, products, setQty, locked }) {
  const [open, setOpen] = useState(false)
  const items = lines.reduce((sum, line) => sum + line.qty, 0)
  return <aside className={`co-summary ${open ? 'open' : ''}`} aria-label="Order summary">
    <button className="co-summary__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span>{open ? 'Hide' : 'Show'} order summary <ChevronDown {...ICON} /></span><b>{formatGhs(totals.total)}</b>
    </button>
    <div className="co-summary__body">
      <h2>Your order <small>{items} {items === 1 ? 'item' : 'items'}</small></h2>
      <ul className="co-lines">{lines.map((line) => <li key={line.id}>
        <span className="co-lines__art"><ProductVisual product={products.find((item) => item.id === line.id)} /><i>{line.qty}</i></span>
        <span className="co-lines__name"><b>{line.name}</b>{line.size ? <small>{line.size}</small> : null}
          {locked ? null : <span className="qty" role="group" aria-label={`Quantity of ${line.name}`}>
            <button type="button" onClick={() => setQty(line.id, line.qty - 1)} aria-label={line.qty === 1 ? 'Remove' : 'One less'}>{line.qty === 1 ? <Trash2 {...ICON} /> : <Minus {...ICON} />}</button>
            <span aria-live="polite">{line.qty}</span>
            <button type="button" onClick={() => setQty(line.id, line.qty + 1)} aria-label="One more" disabled={line.qty >= 20}><Plus {...ICON} /></button>
          </span>}
        </span>
        <b className="co-lines__total">{formatGhs(line.lineTotal)}</b>
      </li>)}</ul>
      <dl className="co-sum">
        <div><dt>Subtotal</dt><dd>{formatGhs(totals.subtotal)}</dd></div>
        <div><dt>{method === 'pickup' ? 'Pickup' : 'Delivery'}</dt><dd>{feeText}</dd></div>
        <div className="co-sum__total"><dt>Total</dt><dd><small>GHS</small>{formatGhs(totals.total).replace('GHS ', '')}</dd></div>
      </dl>
    </div>
  </aside>
}

// After payment: the seal, the order number and what happens next.
function Receipt({ placed }) {
  const paid = placed.payment.status === 'paid'
  return <section className="co-done" aria-labelledby="co-done-title">
    <div className="co-seal" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle className="co-seal__ring" cx="60" cy="60" r="56" /><circle className="co-seal__ring co-seal__ring--inner" cx="60" cy="60" r="48" /></svg>
      <img src="/brand/lordnoble-mark.png" alt="" width="355" height="369" />
    </div>
    <p className="co-kicker">{paid ? 'Order placed' : 'Payment being confirmed'}</p>
    <h1 id="co-done-title" tabIndex={-1}>Thank you, {placed.customer.name.split(' ')[0]}.</h1>
    <p className="co-done__lead">{paid ? `We have your payment of ${formatGhs(placed.total)}.` : `Paystack is still confirming your payment of ${formatGhs(placed.total)}. Your order is placed the moment it does, and we text you.`}</p>
    <div className="co-ticket">
      <span>Order number</span>
      <b>{placed.ref}</b>
      <ul>{(placed.lines || []).map((line) => <li key={line.id}><span>{line.qty} × {line.name}</span><span>{formatGhs(line.lineTotal)}</span></li>)}</ul>
      <p><span>Total</span><b>{formatGhs(placed.total)}</b></p>
    </div>
    <ol className="co-next">
      <li><b>We call you</b> on {placed.customer.phone} to confirm.</li>
      <li><b>{placed.fulfilment.method === 'delivery' ? 'We deliver' : 'You pick up'}</b> {placed.fulfilment.method === 'delivery' ? `to ${placed.fulfilment.address}.` : 'your order at our shop.'}</li>
    </ol>
    <div className="co-done__actions">
      {placed.trackCode && paid ? <a className="ln-btn" href={`/t/${placed.trackCode}`}>Track your order <ArrowNext /></a> : null}
      <a className="ln-btn ln-btn--ghost" href="/shop">Keep shopping</a>
    </div>
  </section>
}

export default function CheckoutPage() {
  const { content, products, cart, setQty, clear, loaded } = useSite()
  const { checkout, shop } = content
  const online = Boolean(checkout.paystackPublicKey)
  const [details, setDetails] = useState(readDetails)
  const [errors, setErrors] = useState({})
  const [phase, setPhase] = useState({ kind: 'idle' }) // idle | paying | saving
  const [placed, setPlaced] = useState(null)
  const form = useRef(null)
  // The same cart and details keep the same request id, so pressing Pay again never places a second order.
  const request = useRef(null)
  const acceptedTotal = useRef(null)

  const lines = useMemo(() => cartLines(cart, products), [cart, products])
  const totals = orderTotals(lines, details.method, checkout.deliveryFee)
  const busy = phase.kind === 'paying' || phase.kind === 'saving'
  const feeText = details.method === 'pickup' ? 'Free' : totals.deliveryFee === null ? 'Confirmed by phone' : formatGhs(totals.deliveryFee)
  // Each step ticks once its fields are complete.
  const check = checkDetails(details, { needEmail: online, delivery: true })
  const contactDone = !check.name && !check.phone && !check.email
  const deliveryDone = contactDone && !check.address && !check.method

  useEffect(() => { document.title = placed ? 'Thank you — Lordnoble Cosmetics' : 'Checkout — Lordnoble Cosmetics' }, [placed])
  useEffect(() => {
    const { notes, ...remember } = details
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify(remember)) } catch { /* not remembered */ }
  }, [details])
  useEffect(() => {
    if (!placed) return
    window.scrollTo({ top: 0 })
    document.getElementById('co-done-title')?.focus({ preventScroll: true })
  }, [placed])

  const update = (key) => (event) => { setDetails({ ...details, [key]: event.target.value }); if (errors[key]) setErrors({ ...errors, [key]: undefined }) }

  const currentRequest = () => {
    const draft = orderRequest({ cart, products, details, payment: PAYMENT.paystack })
    const key = JSON.stringify({ ...draft, requestId: '' })
    if (request.current?.key !== key) request.current = { key, requestId: draft.requestId }
    return { ...draft, requestId: request.current.requestId }
  }

  const done = (order) => {
    setPlaced({ ...order, lines: order.lines || lines })
    clear()
    request.current = null
    acceptedTotal.current = null
    setPhase({ kind: 'idle' })
  }

  // The server prices the basket first; the customer then pays the server's total. It only becomes an order once
  // Paystack confirms the payment, so a closed payment window never leaves an order behind.
  const pay = async (event) => {
    event.preventDefault()
    const found = checkDetails(details, { needEmail: online, delivery: true })
    if (details.method === 'pickup' && !checkout.pickup) found.method = 'Pickup is not available right now. Choose delivery.'
    setErrors(found)
    if (Object.keys(found).length) {
      form.current?.querySelector('.has-error input, .has-error textarea')?.focus()
      return
    }
    if (!online) return
    setPhase({ kind: 'saving' })
    let order
    try {
      order = await placeOrder(currentRequest())
    } catch (error) {
      if (error.fields) setErrors(error.fields)
      setPhase({ kind: 'idle', notice: error.message })
      return
    }
    if (order.total !== totals.total && acceptedTotal.current !== order.total) {
      acceptedTotal.current = order.total
      setPhase({ kind: 'idle', notice: `A price changed since you added it to your cart. Your total is now ${formatGhs(order.total)}. Press Pay again to continue.` })
      return
    }
    setPhase({ kind: 'paying' })
    try {
      const Paystack = await loadPaystack()
      new Paystack().newTransaction({
        key: checkout.paystackPublicKey,
        email: order.customer.email,
        amount: order.total,
        currency: 'GHS',
        reference: paystackReference(order.ref),
        metadata: { order: order.ref, custom_fields: [{ display_name: 'Order', variable_name: 'order', value: order.ref }, { display_name: 'Phone', variable_name: 'phone', value: order.customer.phone }] },
        onSuccess: async (transaction) => {
          setPhase({ kind: 'saving' })
          let status = 'pending'
          try { status = (await verifyPayment(order.ref, transaction?.reference)).status } catch { status = 'pending' }
          done({ ...order, payment: { ...order.payment, status } })
        },
        onCancel: () => setPhase({ kind: 'idle', notice: 'Payment was cancelled. You have not been charged and no order was placed. Press Pay to try again.' }),
        onError: () => setPhase({ kind: 'idle', notice: 'Paystack could not start the payment. Please try again.' }),
      })
    } catch {
      setPhase({ kind: 'idle', notice: 'We could not open Paystack. Check your internet and try again.' })
    }
  }

  const top = <header className="co-top">
    <a href="/" className="brand" aria-label="Lordnoble Cosmetics home"><Logo /></a>
    <span className="co-secure"><Lock {...ICON} /> Secure checkout</span>
    <a className="co-back" href="/shop"><ArrowLeft {...ICON} /> <span>Back to shop</span></a>
  </header>

  if (placed) return <main className="checkout-page">{top}<Receipt placed={placed} /></main>

  if (!lines.length) return <main className="checkout-page">{top}
    <section className="co-empty">
      <img src="/brand/lordnoble-mark-dark.png" alt="" width="355" height="369" />
      <h1>{loaded ? 'Your cart is empty.' : 'Loading your cart…'}</h1>
      {loaded ? <><p>Add something you love, then come back here to pay.</p><a className="ln-btn" href="/shop">Go to the shop <ArrowNext /></a></> : null}
    </section>
  </main>

  return <main className="checkout-page">
    {top}
    <ol className="co-rail" aria-label="Checkout progress">
      <li className={contactDone ? 'is-done' : 'is-current'}><span>1</span>Contact</li>
      <li className={deliveryDone ? 'is-done' : contactDone ? 'is-current' : ''}><span>2</span>Delivery</li>
      <li className={deliveryDone ? 'is-current' : ''}><span>3</span>Pay</li>
    </ol>

    <div className="co-grid">
      <Summary lines={lines} totals={totals} feeText={feeText} method={details.method} products={products} setQty={setQty} locked={busy} />

      <form ref={form} className="co-form" onSubmit={pay} noValidate>
        <h1>Checkout</h1>
        <Step number={1} title="Your contact" done={contactDone}>
          <div className="co-row">
            <Field label="Full name" error={errors.name}><input value={details.name} onChange={update('name')} autoComplete="name" /></Field>
            <Field label="Phone number" hint="We call you on this number" error={errors.phone}><input value={details.phone} onChange={update('phone')} inputMode="tel" autoComplete="tel" placeholder="024 123 4567" /></Field>
          </div>
          <Field label="Email" hint={online ? 'For your payment receipt' : 'Optional'} error={errors.email}><input value={details.email} onChange={update('email')} type="email" inputMode="email" autoComplete="email" /></Field>
        </Step>

        <Step number={2} title="How you get it" done={deliveryDone}>
          <div className="co-methods" role="radiogroup" aria-label="Delivery or pickup">
            <label className={`co-method ${details.method === 'delivery' ? 'on' : ''}`}>
              <input type="radio" name="method" value="delivery" checked={details.method === 'delivery'} onChange={update('method')} />
              <Truck {...ICON} /><span><b>Delivery</b><small>{Number.isInteger(checkout.deliveryFee) ? formatGhs(checkout.deliveryFee) : 'Fee confirmed by phone'}{shop.deliveryTime ? ` · ${shop.deliveryTime}` : ''}</small></span>
            </label>
            {checkout.pickup ? <label className={`co-method ${details.method === 'pickup' ? 'on' : ''}`}>
              <input type="radio" name="method" value="pickup" checked={details.method === 'pickup'} onChange={update('method')} />
              <Store {...ICON} /><span><b>Pick up</b><small>Free · at our shop</small></span>
            </label> : null}
          </div>
          {errors.method ? <p className="co-error" role="alert"><CircleAlert {...ICON} /> {errors.method}</p> : null}
          {details.method === 'delivery'
            ? <Field label="Delivery address" hint="Add a landmark or GPS address" error={errors.address}><textarea rows={3} value={details.address} onChange={update('address')} autoComplete="street-address" /></Field>
            : <p className="co-pickup"><MapPin {...ICON} /> {shop.address || 'We send you the shop address when we call.'}{shop.hours ? ` · Open ${shop.hours}` : ''}</p>}
          <Field label="Note for us" hint="Optional"><textarea rows={2} value={details.notes} onChange={update('notes')} maxLength={500} /></Field>
        </Step>

        <Step number={3} title="Pay">
          <p className="co-paynote">{online ? 'You pay safely with Paystack, by mobile money or card. Your order is placed once your payment is confirmed.' : `Online payment is not open yet.${shop.phone ? ` Call ${shop.phone} to order.` : ''}`}</p>
          {online ? <ul className="co-paywith" aria-label="Ways to pay"><li>MTN MoMo</li><li>Telecel Cash</li><li>AirtelTigo Money</li><li>Card</li></ul> : null}
          {phase.notice ? <p className="co-error" role="alert"><CircleAlert {...ICON} /> {phase.notice}</p> : null}
          <button className="ln-btn ln-btn--foil co-pay" type="submit" disabled={busy || !online}>
            {busy ? (phase.kind === 'paying' ? 'Waiting for Paystack…' : 'Getting your payment ready…') : online ? <><Lock {...ICON} /> Pay {formatGhs(totals.total)}</> : 'Online ordering opens soon'}
          </button>
          <p className="co-terms">By ordering you agree to our <a href="/terms" target="_blank" rel="noreferrer">terms</a>.{totals.deliveryFee === null && details.method === 'delivery' ? ' You pay the delivery fee when your order arrives.' : ''}</p>
        </Step>
      </form>
    </div>
  </main>
}
