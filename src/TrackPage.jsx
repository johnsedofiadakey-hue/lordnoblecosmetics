import { useEffect, useState } from 'react'
import { Check, CircleAlert, Clock, MessageCircle, Package, Phone, Truck } from 'lucide-react'
import { ContactLinks, ICON, SiteFooter, SiteHeader, useSite, whatsappLink } from './storefront'
import { formatGhs } from './cloud/site.js'

// A customer's order, from the private link in their texts and on the checkout's last step: /t/<code>.
// It reads orderTracking/<code> (written only by the server, no contact details) and refreshes every minute.

const STEPS = {
  delivery: [
    { key: 'placed', label: 'Order placed', text: 'We have your order.' },
    { key: 'paid', label: 'Payment received', text: 'Your payment is confirmed.' },
    { key: 'confirmed', label: 'Processing', text: 'We are packing your order.' },
    { key: 'out_for_delivery', label: 'Out for delivery', text: 'Your order is on the way to you.' },
    { key: 'completed', label: 'Delivered', text: 'Enjoy your products!' },
  ],
  pickup: [
    { key: 'placed', label: 'Order placed', text: 'We have your order.' },
    { key: 'paid', label: 'Payment received', text: 'Your payment is confirmed.' },
    { key: 'confirmed', label: 'Processing', text: 'We are getting your order ready.' },
    { key: 'ready', label: 'Ready for pickup', text: 'Come and collect it at our shop.' },
    { key: 'completed', label: 'Collected', text: 'Enjoy your products!' },
  ],
}
const LATER = ['confirmed', 'ready', 'out_for_delivery', 'completed']

function reachedSteps(order) {
  const reached = new Set(['placed'])
  if (order.payment === 'paid') reached.add('paid')
  const at = LATER.indexOf(order.status)
  if (at >= 0) {
    reached.add('confirmed')
    if (order.status !== 'confirmed') reached.add(order.status)
    if (order.status === 'completed') reached.add(order.method === 'pickup' ? 'ready' : 'out_for_delivery')
  }
  return reached
}

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-GB', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

async function loadTracking(code) {
  const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore/lite'), import('./cloud/firebase.js')])
  const snap = await getDoc(doc(db, 'orderTracking', code))
  return snap.exists() ? snap.data() : null
}

export default function TrackPage() {
  const { content } = useSite()
  const code = decodeURIComponent(window.location.pathname.split('/')[2] || '')
  const valid = /^[A-Za-z0-9_-]{16}$/.test(code)
  const [order, setOrder] = useState(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => { document.title = 'Track your order — Lordnoble Cosmetics' }, [])
  useEffect(() => {
    if (!valid) { setOrder(null); return undefined }
    let live = true
    const refresh = () => loadTracking(code).then((next) => { if (live) { setOrder(next); setFailed(false) } }).catch(() => { if (live) setFailed(true) })
    refresh()
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [code, valid])

  const shop = content.shop
  const wa = whatsappLink(shop.whatsapp)

  return <main className="info-page track-page">
    <SiteHeader />
    <section className="page-hero">
      <h1>Track your order</h1>
      {order?.ref ? <p className="page-hero__text">Order <b>{order.ref}</b></p> : null}
    </section>
    <section className="section track">
      {order === undefined && !failed ? <p className="review-empty">Loading your order…</p>
        : failed && order === undefined ? <p className="review-empty">We could not load your order. Check your internet and reload the page.</p>
          : !order ? <div className="track-missing">
            <CircleAlert {...ICON} />
            <p>We could not find this order. Check that you opened the full link from your text message, or contact us with your order number.</p>
            <div className="shop-empty__contact"><ContactLinks shop={shop} /></div>
          </div>
            : <TrackDetails order={order} wa={wa} shop={shop} />}
    </section>
    <SiteFooter />
  </main>
}

function TrackDetails({ order, wa, shop }) {
  const steps = STEPS[order.method] || STEPS.delivery
  const reached = reachedSteps(order)
  const cancelled = order.status === 'cancelled' || order.status === 'unpaid'
  const unpaid = order.status === 'unpaid'
  const current = [...steps].reverse().find((step) => reached.has(step.key))
  const headline = unpaid ? 'This order was not paid, so it was not placed.' : cancelled ? 'This order was cancelled.' : current?.text
  return <div className="track-grid">
    <div className="track-status">
      <div className={`track-headline ${cancelled ? 'is-cancelled' : ''}`}>
        <span className="track-headline__icon">{cancelled ? <CircleAlert {...ICON} /> : order.status === 'out_for_delivery' ? <Truck {...ICON} /> : order.status === 'completed' ? <Check {...ICON} /> : <Package {...ICON} />}</span>
        <div>
          <b>{unpaid ? 'Not paid' : cancelled ? 'Cancelled' : current?.label}</b>
          <p>{headline}{order.firstName && !cancelled ? ` Thank you, ${order.firstName}.` : ''}</p>
        </div>
      </div>
      {cancelled && order.payment === 'paid' ? <p className="track-note">If you paid, your refund is on its way. Contact us if you have any questions.</p> : null}
      {order.payment === 'awaiting' && !cancelled ? <p className="track-note"><Clock {...ICON} /> We are waiting for Paystack to confirm your payment.</p> : null}
      {order.payment === 'pay_later' && !cancelled ? <p className="track-note">You pay {order.method === 'pickup' ? 'when you collect' : 'on delivery'}: cash or mobile money.</p> : null}
      {order.payment === 'problem' ? <p className="track-note">We need to check your payment with you. We will call you.</p> : null}
      <ol className="track-steps">{steps.map((step) => {
        const done = reached.has(step.key)
        const isCurrent = !cancelled && current?.key === step.key
        const label = step.key === 'paid' && order.payment === 'pay_later' ? (order.method === 'pickup' ? 'Pay when you collect' : 'Pay on delivery') : step.label
        return <li key={step.key} className={`${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
          <span className="track-dot" aria-hidden="true">{done ? <Check {...ICON} /> : null}</span>
          <span className="track-step"><b>{label}</b>{order.times?.[step.key] ? <small>{when(order.times[step.key])}</small> : null}</span>
        </li>
      })}</ol>
      <p className="track-updated">Last updated {when(order.updatedAt)}. This page refreshes by itself.</p>
    </div>
    <aside className="track-summary">
      <h2>Your order</h2>
      <ul>{order.lines.map((line, index) => <li key={index}>
        {line.image ? <img src={line.image} alt="" loading="lazy" /> : <span className="track-thumb" aria-hidden="true" />}
        <span><b>{line.name}</b><small>{[line.size, `× ${line.qty}`].filter(Boolean).join(' · ')}</small></span>
        <em>{formatGhs(line.lineTotal)}</em>
      </li>)}</ul>
      <dl>
        {order.subtotal !== null ? <div><dt>Items</dt><dd>{formatGhs(order.subtotal)}</dd></div> : null}
        <div><dt>{order.method === 'pickup' ? 'Pickup' : 'Delivery'}</dt><dd>{order.method === 'pickup' ? 'Free' : order.deliveryFee === null ? 'Agreed on the phone' : formatGhs(order.deliveryFee)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{formatGhs(order.total)}</dd></div>
      </dl>
      <div className="track-help">
        <b>Questions about your order?</b>
        {wa ? <a className="btn-wine" href={wa} target="_blank" rel="noreferrer"><MessageCircle {...ICON} /> WhatsApp us</a> : null}
        {shop.phone ? <a className="btn-outline" href={`tel:${shop.phone.replace(/\s/g, '')}`}><Phone {...ICON} /> Call {shop.phone}</a> : null}
        <small>Have your order number ready: {order.ref}</small>
      </div>
    </aside>
  </div>
}
