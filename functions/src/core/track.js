// Order tracking for customers. Every website order gets a long random code; /t/<code> on the website shows
// that one order. The page reads orderTracking/<code>: a copy of the order that holds only what the customer
// needs (no phone, email or address), kept up to date in the same transaction as every change to the order.
// Nobody can list tracking records (firestore.rules), so a code works like a private link.
import { randomBytes } from 'node:crypto'

export const SITE_URL = (process.env.SITE_URL || 'https://lordnoblecosmetics.com').replace(/\/+$/, '')

// 16 characters from 96 random bits: short enough for a text message, impossible to guess.
export const newTrackCode = () => randomBytes(12).toString('base64url')
export const TRACK_CODE = /^[A-Za-z0-9_-]{16}$/
export const trackLink = (code) => `${SITE_URL}/t/${code}`

// What the customer sees about payment.
function paymentState(payment = {}) {
  if (['paid', 'confirmed', 'paid_offline'].includes(payment.status)) return 'paid'
  if (payment.method === 'pay_later') return 'pay_later'
  if (payment.status === 'mismatch') return 'problem'
  return 'awaiting' // pending or reported: waiting for Paystack's confirmation
}

// The safe copy of an order. `times` records when each stage was reached (merged, never overwritten).
export function trackingView(order, now, reached = []) {
  const times = Object.fromEntries(reached.map((stage) => [stage, now]))
  return {
    ref: order.ref,
    firstName: String(order.customer?.name || '').trim().split(/\s+/)[0].slice(0, 40),
    status: order.status,
    method: order.fulfilment?.method === 'pickup' ? 'pickup' : 'delivery',
    payment: paymentState(order.payment),
    lines: (order.lines || []).map((line) => ({ name: line.name, size: line.size || '', image: line.image || '', qty: line.qty, lineTotal: line.lineTotal })),
    subtotal: order.subtotal ?? null,
    deliveryFee: order.deliveryFee ?? null,
    total: order.total,
    placedAt: order.placedAt,
    updatedAt: now,
    times,
  }
}
