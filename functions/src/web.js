// Website orders. The browser only sends what the customer chose (product ids, quantities, their details);
// the server prices it from the catalogue. Lordnoble only accepts paid orders, so the priced basket is kept in
// `checkouts/{ref}` (never shown to staff) while the customer pays. It becomes `orders/{ref}` only when Paystack
// itself confirms the payment: by our verify call (verifyWebPayment) or by Paystack's signed webhook, never by the
// browser's word. An abandoned payment therefore never appears as an order.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'
import { checkDetails, normalizeGhanaPhone, ORDER_REF, orderRefFromReference, priceWebOrder } from './core/order.js'
import { RuleError } from './core/rules.js'
import { businessDay } from './core/time.js'
import { checkRequestId } from './shared.js'
import { readSettings } from './settings.js'
import { sendSms, smsText } from './sms.js'
import { newTrackCode, trackingView, trackLink } from './core/track.js'

const WEBSITE = { uid: null, name: 'Website', role: 'customer' }
const PAYSTACK_VERIFY = 'https://api.paystack.co/transaction/verify/'
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// At most this many unpaid checkouts per phone in the last hour (stops someone filling the database).
const OPEN_CHECKOUT_LIMIT = 5
const HOUR = 60 * 60 * 1000

const newRef = () => `AT-${Array.from(randomBytes(6), (byte) => REF_ALPHABET[byte % REF_ALPHABET.length]).join('')}`

// Keeps the customer's tracking page in step with the order, inside the same transaction. `reached` lists the
// stages this change reached ('placed', 'paid', 'confirmed', 'out_for_delivery', …); their times are kept.
export function writeTracking(tx, db, order, now, reached = []) {
  if (!order?.trackCode) return
  tx.set(db.doc(`orderTracking/${order.trackCode}`), trackingView(order, now, reached), { merge: true })
}

function webAudit(tx, db, now, ref, summary, detail = '') {
  tx.set(db.collection('audit').doc(), { at: now, day: businessDay(now), type: 'web_order', actor: WEBSITE, ref, summary, detail })
}

const money = (pesewas) => `${(pesewas / 100).toFixed(2)} GHS`

// Texts the customer about their order, if the owner turned that message on. Never throws.
export async function notifyCustomer(ctx, order, kind) {
  try {
    const settings = await readSettings(ctx.db)
    // Only two texts: payment confirmed by Paystack, and out for delivery.
    const wanted = { order_paid: settings.sms.orderPaid, order_out_for_delivery: settings.sms.outForDelivery }[kind]
    if (!wanted) return false
    const shop = (await ctx.db.doc('site/content').get()).data()?.shop || {}
    const text = smsText(kind, { ref: order.ref, total: order.total, shopName: 'Lordnoble', phone: shop.phone || '', link: order.trackCode ? trackLink(order.trackCode) : '' })
    return await sendSms(ctx, settings, { to: order.customer?.phone, kind, ref: order.ref, text })
  } catch {
    return false
  }
}

// data: { requestId, payment: 'paystack', details: { name, phone, email, method, address, notes }, lines: [{ id, qty }] }
// Returns the priced checkout. It is not an order yet: that happens in applyPaystackCharge.
export async function placeWebOrder(ctx, data) {
  const { db, now } = ctx
  const requestId = checkRequestId(data?.requestId)
  if (data?.payment !== 'paystack') throw new RuleError('bad_payment', 'Please pay online with Paystack to place your order.')
  // Without the secret key the server could not confirm the payment, so it does not start one.
  if (!ctx.secrets?.paystack) throw new RuleError('payments_off', 'Online ordering is not open right now. Please call or WhatsApp us to order.')
  const details = data?.details || {}

  return db.runTransaction(async (tx) => {
    const requestRef = db.doc(`requests/web_${requestId}`)
    const request = await tx.get(requestRef)
    if (request.exists) return request.data().result
    const [contentSnap, catalogSnap, availabilitySnap] = await tx.getAll(db.doc('site/content'), db.doc('site/catalog'), db.doc('site/availability'))
    const checkout = { deliveryFee: null, pickup: true, paystackPublicKey: '', ...(contentSnap.data()?.checkout || {}) }
    if (!checkout.paystackPublicKey) throw new RuleError('payments_off', 'Online ordering is not open right now. Please call or WhatsApp us to order.')

    const errors = checkDetails(details, { needEmail: true, delivery: true })
    if (details.method === 'pickup' && checkout.pickup === false) errors.method = 'Pickup is not available right now. Choose delivery.'
    if (Object.keys(errors).length) {
      const error = new RuleError('bad_details', Object.values(errors)[0])
      error.details = { fields: errors }
      throw error
    }
    const phone = normalizeGhanaPhone(details.phone)
    const recent = await tx.get(db.collection('checkouts').where('customer.phone', '==', phone).limit(30))
    const unpaid = recent.docs.filter((doc) => doc.data().status === 'awaiting_payment' && doc.data().placedAt > now - HOUR)
    if (unpaid.length >= OPEN_CHECKOUT_LIMIT) throw new RuleError('too_many_orders', 'Too many unfinished payments from this number. Please wait an hour or call us.')

    const priced = priceWebOrder({
      products: Array.isArray(catalogSnap.data()?.products) ? catalogSnap.data().products : [],
      availability: availabilitySnap.data()?.products || {},
      lines: data?.lines,
      method: details.method,
      deliveryFee: checkout.deliveryFee,
    })

    let ref = null
    for (let attempt = 0; attempt < 5 && !ref; attempt += 1) {
      const candidate = newRef()
      const [asOrder, asCheckout] = await tx.getAll(db.doc(`orders/${candidate}`), db.doc(`checkouts/${candidate}`))
      if (!asOrder.exists && !asCheckout.exists) ref = candidate
    }
    if (!ref) throw new RuleError('busy', 'Please press the button again.')

    const method = details.method
    const next = {
      ref,
      channel: 'website',
      status: 'awaiting_payment',
      customer: { name: String(details.name).trim().slice(0, 80), phone, email: String(details.email || '').trim().slice(0, 120) },
      fulfilment: { method, address: method === 'delivery' ? String(details.address || '').trim().slice(0, 300) : '', notes: String(details.notes || '').trim().slice(0, 500) },
      ...priced,
      payment: { method: 'paystack', status: 'pending', reference: null },
      placedAt: now,
      // The customer's private tracking link (/t/<code>). It starts working once the payment is confirmed.
      trackCode: newTrackCode(),
    }
    tx.set(db.doc(`checkouts/${ref}`), { ...next, createdAt: Timestamp.fromMillis(now) })
    tx.set(requestRef, { at: now, result: next })
    return next
  })
}

// Records what Paystack says about a charge. charge is Paystack's transaction object. source: 'verify' | 'webhook'.
// A confirmed payment turns the checkout into a real order (the only way a website order is ever created).
export async function applyPaystackCharge(ctx, charge, source) {
  const { db, now } = ctx
  const ref = orderRefFromReference(charge?.reference)
  if (!ref) return { status: 'ignored' }
  if (charge.status !== 'success') return { status: 'not_paid' }
  const orderRef = db.doc(`orders/${ref}`)
  const checkoutRef = db.doc(`checkouts/${ref}`)
  const result = await db.runTransaction(async (tx) => {
    const [orderSnap, checkoutSnap] = await tx.getAll(orderRef, checkoutRef)
    const existing = orderSnap.exists ? orderSnap.data() : null
    if (existing?.payment?.status === 'paid') return { status: 'paid', changed: false, order: existing }
    const base = existing || (checkoutSnap.exists ? checkoutSnap.data() : null)
    if (!base) return { status: 'ignored' }
    const ok = charge.currency === 'GHS' && charge.amount === base.total
    const payment = {
      method: 'paystack',
      status: ok ? 'paid' : 'mismatch',
      reference: String(charge.reference),
      amountPaid: Number.isInteger(charge.amount) ? charge.amount : null,
      currency: String(charge.currency || ''),
      channel: charge.channel ? String(charge.channel) : null,
      paidAt: Date.parse(charge.paid_at || charge.paidAt || '') || now,
      verifiedAt: now,
      verifiedBy: source,
    }
    let order
    if (existing) {
      // An order from before paid-only checkout (or one already flagged for a wrong amount).
      order = { ...existing, payment }
      tx.update(orderRef, { payment, updatedAt: now })
      writeTracking(tx, db, order, now, ok ? ['paid'] : [])
    } else {
      // Money has reached Paystack: this is now an order staff can see and fulfil.
      const { createdAt, ...checkout } = base
      order = { ...checkout, status: 'new', payment, paidAt: payment.paidAt, updatedAt: now }
      tx.set(orderRef, { ...order, createdAt: Timestamp.fromMillis(now) })
      tx.update(checkoutRef, { status: ok ? 'paid' : 'mismatch', orderRef: ref, updatedAt: now })
      writeTracking(tx, db, order, now, ok ? ['placed', 'paid'] : ['placed'])
    }
    const items = (base.lines || []).reduce((sum, line) => sum + line.qty, 0)
    webAudit(tx, db, now, ref, ok ? `Website order ${ref} paid: ${items} item(s), ${money(base.total)} verified by Paystack` : `Website order ${ref}: Paystack amount does not match`,
      ok ? `${payment.channel || 'paystack'} · ${payment.reference}${existing?.status === 'cancelled' ? ' · order was already cancelled, refund the customer' : ''}` : `Paid ${payment.amountPaid === null ? '?' : money(payment.amountPaid)} ${payment.currency}, order total ${money(base.total)}`)
    return { status: payment.status, changed: true, order }
  })
  if (result.changed && result.status === 'paid') await notifyCustomer(ctx, result.order, 'order_paid')
  return { status: result.status }
}

// Called by the checkout after Paystack's popup reports success. data: { ref, reference }
// Asks Paystack itself; the browser saying "paid" is never enough.
export async function verifyWebPayment(ctx, data) {
  const { db } = ctx
  const ref = String(data?.ref ?? '')
  const reference = String(data?.reference ?? '')
  if (!ORDER_REF.test(ref) || orderRefFromReference(reference) !== ref) throw new RuleError('bad_reference', 'This payment does not belong to this order.')
  const [orderSnap, checkoutSnap] = await db.getAll(db.doc(`orders/${ref}`), db.doc(`checkouts/${ref}`))
  const record = orderSnap.exists ? orderSnap.data() : checkoutSnap.exists ? checkoutSnap.data() : null
  if (!record) throw new RuleError('not_found', 'Order not found.')
  if (record.payment?.method !== 'paystack') throw new RuleError('bad_state', 'This order is not paid online.')
  if (orderSnap.exists && ['paid', 'mismatch'].includes(record.payment?.status)) return { status: record.payment.status }

  const secret = ctx.secrets?.paystack
  // No secret key: we cannot confirm, so it stays a checkout. Paystack's webhook confirms it once the key is set.
  if (!secret) return { status: 'pending' }
  let charge
  try {
    const response = await (ctx.fetch || fetch)(PAYSTACK_VERIFY + encodeURIComponent(reference), { headers: { Authorization: `Bearer ${secret}` } })
    charge = (await response.json())?.data
  } catch {
    throw new RuleError('paystack_unreachable', 'We could not reach Paystack to confirm your payment. If you were charged, your order will appear as soon as Paystack confirms it, and we will text you.')
  }
  if (!charge || charge.status !== 'success') return { status: 'pending' }
  return applyPaystackCharge(ctx, charge, 'verify')
}

// Paystack's webhook. Returns the HTTP status to send back. The signature is an HMAC-SHA512 of the raw body.
export async function handlePaystackWebhook(ctx, { rawBody, signature }) {
  const secret = ctx.secrets?.paystack
  if (!secret || !rawBody || !signature) return 401
  const expected = Buffer.from(createHmac('sha512', secret).update(rawBody).digest('hex'))
  const given = Buffer.from(String(signature))
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 401
  let event
  try { event = JSON.parse(rawBody.toString('utf8')) } catch { return 400 }
  if (event?.event === 'charge.success') await applyPaystackCharge(ctx, event.data, 'webhook')
  return 200
}
