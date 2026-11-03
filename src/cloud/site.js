// Website content: the defaults shipped with the site, and how saved edits (Firestore `site/content` and
// `site/catalog`) are merged over them. Pure functions, shared by the website and the admin editor.

// Two ways into the range (see planning/LORDNOBLE_POSITIONING_RESET.md). "Skin concerns" products only
// appear on the website when the owner has marked them ready, like every other product.
export const LINES = [
  { id: 'Everyday care', label: 'Everyday care', description: 'Beauty and body care for your daily routine.' },
  { id: 'Skin concerns', label: 'Skin concerns', description: 'Care for more specific skin questions. Read the directions and cautions before you buy.' },
]

// Needs a customer can shop by. Cosmetic language only: what a product is for, never a diagnosis.
export const SHOP_NEEDS = [
  { id: 'Daily moisture', label: 'Daily moisture', description: 'Comfort for skin that feels dry.' },
  { id: 'Glow', label: 'Glow', description: 'Radiance and an even-looking finish.' },
  { id: 'Even-looking tone', label: 'Even-looking tone', description: 'Care for marks and uneven-looking skin.' },
  { id: 'Smooth texture', label: 'Smooth texture', description: 'Exfoliation and softer-feeling skin.' },
  { id: 'Gentle care', label: 'Gentle care', description: 'Mild formulas for everyday use.' },
  { id: 'Body ritual', label: 'Body ritual', description: 'Bath, body and self-care moments.' },
  { id: 'Intimate care', label: 'Intimate care', description: 'Discreet everyday feminine care.' },
]

// Product categories belong to the owner: added, renamed, ordered and described in Admin → Website →
// Categories. None are shipped. The website shows a category only once it has a product on show, so an empty
// category never appears to customers.
export const DEFAULT_CATEGORIES = []
export const MAX_CATEGORIES = 24

// Small line icons the owner can pick for categories, the hero promises and "Why shop" (names only; the website
// draws them). Unknown names fall back to the first one.
export const ICON_CHOICES = ['flower', 'body', 'face', 'leaf', 'tools', 'drop', 'sparkles', 'heart', 'gem', 'shield', 'truck', 'star', 'gift', 'sun', 'lotus', 'bag']
const icon = (value) => (ICON_CHOICES.includes(value) ? value : ICON_CHOICES[0])
const picture = (value) => String(value ?? '').trim().slice(0, 1000)

// Names trimmed, blanks and repeats (ignoring case) dropped, order kept.
export function cleanCategories(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const clean = []
  for (const item of list) {
    const name = String(item?.name ?? '').trim().slice(0, 40)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    clean.push({ name, text: String(item?.text ?? '').trim().slice(0, 120), image: picture(item?.image), icon: icon(item?.icon) })
  }
  return clean.slice(0, MAX_CATEGORIES)
}

// The categories customers see: the owner's order, only those with at least one product on show.
export const shownCategories = (categories, products) => categories
  .map((category) => ({ ...category, items: products.filter((product) => product.category === category.name) }))
  .filter((category) => category.items.length)

export const SHOP_INGREDIENTS = ['Shea butter', 'Cocoa butter', 'Vitamin C', 'Vitamin E', 'Niacinamide', 'Hyaluronic acid', 'Aloe vera', 'Collagen', 'Honey']

// ---- Owner-editable lists and layout (Admin → Website → Tags and paths / Layout and menu) ---------------
// Needs and key ingredients start from the lists above; the owner can add, rename, describe, reorder and
// remove them. Products keep the label of each tag, and a rename moves the products with it.
export const MAX_TAGS = 30
export function cleanTags(saved) {
  const unique = (list, max) => {
    const seen = new Set()
    return list.filter((item) => {
      const key = item.label.toLowerCase()
      if (!item.label || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, max)
  }
  const needs = Array.isArray(saved?.needs)
    ? unique(saved.needs.map((need) => ({ label: String(need?.label ?? '').trim().slice(0, 40), description: String(need?.description ?? '').trim().slice(0, 160) })), MAX_TAGS)
    : SHOP_NEEDS.map(({ label, description }) => ({ label, description }))
  const ingredients = Array.isArray(saved?.ingredients)
    ? unique(saved.ingredients.map((label) => ({ label: String(label ?? '').trim().slice(0, 40) })), MAX_TAGS).map((item) => item.label)
    : [...SHOP_INGREDIENTS]
  return { needs, ingredients }
}

// The two shop paths keep their ids (orders and the cautions rule use them); their names and words can change.
export function cleanLines(saved) {
  return LINES.map((line) => {
    const own = Array.isArray(saved) ? saved.find((item) => item?.id === line.id) : null
    return {
      id: line.id,
      label: String(own?.label ?? '').trim().slice(0, 40) || line.label,
      description: String(own?.description ?? line.description).trim().slice(0, 200),
    }
  })
}
export const lineLabel = (lines, id) => lines.find((line) => line.id === id)?.label || id

// Home page sections (after the hero) and menu links, in the owner's order, each shown or hidden.
export const HOME_SECTIONS = [
  { key: 'explore', label: 'Explore our products (category cards)' },
  { key: 'loved', label: 'Our most loved products' },
  { key: 'why', label: 'Why shop with us' },
  { key: 'reviews', label: 'Customer reviews' },
  { key: 'cta', label: 'Closing banner' },
]
export const MENU_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'shop', label: 'Shop' },
  { key: 'categories', label: 'Categories' },
  { key: 'about', label: 'About Us' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'contact', label: 'Contact' },
]
function cleanOrdered(saved, known, withLabel) {
  const list = Array.isArray(saved) ? saved : []
  const result = []
  for (const item of list) {
    const base = known.find((entry) => entry.key === item?.key)
    if (!base || result.some((entry) => entry.key === base.key)) continue
    result.push({ key: base.key, show: item.show !== false, ...(withLabel ? { label: String(item.label ?? '').trim().slice(0, 30) || base.label } : {}) })
  }
  for (const base of known) {
    if (!result.some((entry) => entry.key === base.key)) result.push({ key: base.key, show: true, ...(withLabel ? { label: base.label } : {}) })
  }
  return result
}
export const cleanLayout = (saved) => ({
  sections: cleanOrdered(saved?.sections, HOME_SECTIONS, false),
  menu: cleanOrdered(saved?.menu, MENU_ITEMS, true),
})

// Shop details. Empty values are simply left out of the website until the owner fills them in.
export const SHOP_FIELDS = [
  { key: 'legalName', label: 'Registered business name' },
  { key: 'phone', label: 'Shop phone number' },
  { key: 'whatsapp', label: 'WhatsApp number' },
  { key: 'email', label: 'Shop email' },
  { key: 'address', label: 'Shop address' },
  { key: 'hours', label: 'Opening hours' },
  { key: 'deliveryAreas', label: 'Areas we deliver to' },
  { key: 'deliveryTime', label: 'Delivery time' },
  { key: 'returnDays', label: 'Days to return an item' },
  { key: 'refundDays', label: 'Days to send a refund' },
  { key: 'instagram', label: 'Instagram link' },
  { key: 'tiktok', label: 'TikTok link' },
  { key: 'facebook', label: 'Facebook link' },
]

export const HERO_IMAGE = '/campaign/hero-model.jpg'

export const DEFAULT_CONTENT = {
  shop: Object.fromEntries(SHOP_FIELDS.map((field) => [field.key, ''])),
  // The approved shop logo is the default and can be replaced in Admin → Website → Shop details.
  // logoDark sits on light backgrounds (header); logoLight on the dark footer.
  brand: {
    logoDark: '/brand/lordnoble-logo-primary.png',
    logoLight: '/brand/lordnoble-logo-light.png',
    logoAlt: 'Lordnoble Cosmetics',
  },
  categories: DEFAULT_CATEGORIES,
  // The home page (the client's reference design). Every word and picture is editable in Admin → Website.
  home: {
    topbar: ['Nationwide delivery (Ghana)', '100% authentic products', 'Beauty. Wellness. Confidence.'],
    heroKicker: 'Premium beauty products',
    heroTitle: 'Beauty Products\nfor a More',
    heroAccent: 'Confident You',
    heroText: 'Care for your body. Enhance your beauty.\nFeel good every day with Lordnoble.',
    heroAction: 'Shop Now',
    heroImage: '/campaign/hero-model.jpg',
    heroImageAlt: 'Smiling woman with a towel wrapped in her hair after her skin care routine',
    heroScript: 'Beauty\nWellness\nConfidence',
    heroBadges: [
      { icon: 'leaf', label: 'High quality ingredients' },
      { icon: 'shield', label: 'Safe and gentle' },
      { icon: 'lotus', label: 'Beauty for every woman' },
    ],
    categoriesKicker: 'Shop by category',
    categoriesTitle: 'Explore Our',
    categoriesAccent: 'Products',
    bestKicker: 'Best sellers',
    bestTitle: 'Our Most Loved Products',
    whyTitle: 'Why Shop',
    whyAccent: 'Lordnoble?',
    whyItems: [
      { icon: 'gem', label: 'Premium quality' },
      { icon: 'truck', label: 'Fast and reliable delivery' },
      { icon: 'shield', label: 'Secure payment' },
      { icon: 'leaf', label: 'Carefully chosen products' },
      { icon: 'heart', label: 'Loved by our customers' },
    ],
    reviewsKicker: 'Real results',
    reviewsTitle: 'What Our Customers Say',
    ctaTitle: 'Ready to Glow?',
    ctaText: 'Shop your favourite beauty products today and enjoy fast delivery anywhere in Ghana.',
    ctaAction: 'Shop Now',
    ctaImage: '',
  },
  tags: { needs: SHOP_NEEDS.map(({ label, description }) => ({ label, description })), ingredients: [...SHOP_INGREDIENTS] },
  lines: LINES.map((line) => ({ ...line })),
  layout: { sections: HOME_SECTIONS.map(({ key }) => ({ key, show: true })), menu: MENU_ITEMS.map(({ key, label }) => ({ key, label, show: true })) },
  // Headings and short lines on the other pages.
  pages: {
    shopKicker: 'Shop',
    shopTitle: 'All',
    shopAccent: 'Products',
    reviewsKicker: 'Real results',
    reviewsTitle: 'What Our',
    reviewsAccent: 'Customers Say',
    contactKicker: 'Contact',
    contactTitle: 'We are',
    contactAccent: 'here to help',
    contactText: 'Questions about a product or your order? Get in touch.',
    footerText: 'Beauty and wellness products, delivered',
  },
  // The About Us page.
  about: {
    title: 'About Lordnoble',
    text: '',
    image: '',
    imageAlt: '',
  },
  checkout: {
    deliveryFee: null, // pesewas; null = "we tell you the delivery fee when we call"
    pickup: true,
    paystackPublicKey: '',
  },
  terms: {
    updated: '2026-10-05',
    sections: [
      { title: 'Who we are', body: 'This website is run by {legalName} ("Lordnoble Cosmetics", "we", "us").\nOur shop is at {address}.\nYou can reach us on {phone}.\nYou can email us at {email}.' },
      { title: 'Using this website', body: 'By using this website or placing an order, you agree to these terms.\nPlease give us true and complete details when you order.' },
      { title: 'Our products and your skin', body: 'Read the label, directions and cautions before you use any product.\nBefore you use a new product, try a little on a small area of skin first. Stop using it if your skin reacts.\nIf you are pregnant, breastfeeding, taking medicine, or have a skin condition, ask a doctor or pharmacist before use.\nOur product information helps you choose. It is not medical advice.' },
      { title: 'Prices and payment', body: 'All prices are in Ghana cedis (GHS).\nPrices can change, but the price you pay is the price shown when you placed your order.\nWe accept secure Paystack payments, including MTN MoMo, Telecel Cash, AirtelTigo Money, cards and bank transfer where available. We never see or keep your card details.' },
      { title: 'Your order', body: 'After you order, we contact you to confirm it.\nIf an item is out of stock or a price was wrong, we tell you. You can then change or cancel your order, and we give back any money you paid.' },
      { title: 'Delivery and pickup', body: 'We deliver to: {deliveryAreas}.\nDelivery usually takes {deliveryTime}.\nThe delivery fee is shown at checkout, or we tell you when we call.\nYou can also pick up your order at our shop ({hours}).\nPlease check your order when you receive it and tell us straight away if something is wrong.' },
      { title: 'Returns and refunds', body: 'You can return an item within {returnDays} days if it is unopened and still sealed.\nFor health and hygiene reasons, we cannot take back opened items, unless they arrived damaged or we sent the wrong item.\nIf we accept a return, we refund you within {refundDays} days, using the same way you paid.' },
      { title: 'Your personal information', body: 'We only use your name, phone number, email and address to handle your order and contact you about it.\nWe keep your information safe and we do not sell it. We follow the Data Protection Act, 2012 (Act 843).\nTo see, change or delete your information, contact us.' },
      { title: 'Changes to these terms', body: 'We may update these terms. The date at the top shows the last change. The terms that apply to your order are the ones shown when you placed it.' },
      { title: 'Law', body: 'These terms follow the laws of Ghana.' },
    ],
  },
}

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function mergeContent(saved) {
  const next = structuredClone(DEFAULT_CONTENT)
  if (!isPlainObject(saved)) return next
  for (const part of ['shop', 'brand', 'home', 'about', 'pages', 'checkout']) {
    if (isPlainObject(saved[part])) Object.assign(next[part], saved[part])
  }
  if (isPlainObject(saved.tags)) next.tags = cleanTags(saved.tags)
  if (Array.isArray(saved.lines)) next.lines = cleanLines(saved.lines)
  if (isPlainObject(saved.layout)) next.layout = cleanLayout(saved.layout)
  if (Array.isArray(saved.categories)) next.categories = cleanCategories(saved.categories)
  if (isPlainObject(saved.terms)) {
    if (typeof saved.terms.updated === 'string') next.terms.updated = saved.terms.updated
    if (Array.isArray(saved.terms.sections)) next.terms.sections = saved.terms.sections.filter((section) => section && typeof section.title === 'string' && typeof section.body === 'string')
  }
  return next
}

const text = (value, max) => String(value ?? '').slice(0, max)

export function cleanProduct(product, index = 0) {
  const price = Number.isInteger(product?.price) && product.price > 0 ? product.price : null
  const list = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 12) : []
  return {
    id: String(product?.id || `product-${index + 1}`),
    name: text(product?.name || 'Untitled product', 80),
    brand: text(product?.brand || 'Lordnoble', 40),
    category: text(product?.category, 40).trim(),
    line: LINES.some((line) => line.id === product?.line) ? product.line : LINES[0].id,
    type: text(product?.type, 60),
    description: text(product?.description, 400),
    size: text(product?.size, 30),
    howToUse: text(product?.howToUse, 1200),
    ingredientList: text(product?.ingredientList, 2000),
    cautions: text(product?.cautions, 1200),
    needs: list(product?.needs),
    ingredients: list(product?.ingredients),
    price,
    // Photos: the first is the main one (image keeps it for the till, stock screens and order lines).
    images: (Array.isArray(product?.images) ? product.images : [product?.image])
      .filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().slice(0, 1000)).slice(0, MAX_PHOTOS),
    image: text((Array.isArray(product?.images) && product.images[0]) || product?.image, 1000),
    // Short product videos (played in the product panel's gallery, after the photos).
    videos: (Array.isArray(product?.videos) ? product.videos : [])
      .filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().slice(0, 1000)).slice(0, MAX_VIDEOS),
    // Sizes of one product are separate catalogue items (own price, stock, barcode) that share a groupId.
    groupId: text(product?.groupId, 80),
    bestSeller: product?.bestSeller === true,
    visible: product?.visible === true,
    inStock: product?.inStock !== false,
  }
}

export const MAX_PHOTOS = 8
export const MAX_VIDEOS = 3
export const MAX_SIZES = 8

// ---- Products with several sizes ----------------------------------------------------------------------
// The catalogue (site/catalog) stays a flat list of sellable items, because the till, stock, server pricing
// and orders all work per item. Items that share a groupId are the sizes of one product: the website shows them
// as one product with a size picker and the admin edits them together. Older items without a groupId are a
// product with a single size.
const SHARED = ['name', 'brand', 'category', 'line', 'type', 'description', 'howToUse', 'ingredientList', 'cautions', 'needs', 'ingredients', 'images', 'image', 'videos', 'bestSeller', 'visible']

export function groupProducts(products) {
  const groups = new Map()
  for (const product of products) {
    const key = product.groupId || product.id
    if (!groups.has(key)) groups.set(key, { ...Object.fromEntries(SHARED.map((field) => [field, product[field]])), id: key, sizes: [] })
    groups.get(key).sizes.push({ id: product.id, size: product.size, price: product.price, inStock: product.inStock !== false })
  }
  return [...groups.values()].map((group) => {
    const prices = group.sizes.map((size) => size.price).filter(Boolean)
    return { ...group, size: group.sizes[0]?.size || '', price: prices.length ? Math.min(...prices) : null, maxPrice: prices.length ? Math.max(...prices) : null, inStock: group.sizes.some((size) => size.inStock) }
  })
}

// Back to sellable items. New products get an id from their name; new sizes get "<product>-<size>".
// Ids that were saved before never change, so stock, orders and links that point at them keep working.
export function flattenGroups(groups, savedIds = new Set()) {
  const taken = new Set(groups.flatMap((group) => [group.id, ...group.sizes.map((size) => size.id)]))
  const claim = (base) => {
    let id = base
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`
    taken.add(id)
    return id
  }
  const flat = []
  for (const group of groups) {
    let groupId = group.id
    const fresh = /^new-product-([a-z0-9]+)$/.exec(groupId)
    if (fresh && !savedIds.has(groupId) && !/^new product$/i.test(String(group.name).trim())) {
      taken.delete(groupId)
      groupId = claim(`${slugify(group.name)}-${fresh[1]}`)
    }
    group.sizes.forEach((size, index) => {
      let id = size.id
      if (!savedIds.has(id) && (/^new-/.test(id) || id === group.id)) {
        taken.delete(id)
        // A new product's first size takes the product's own id (as single-size products always have).
        const first = index === 0 && !savedIds.has(groupId) && !flat.some((item) => item.id === groupId)
        id = first ? groupId : claim(`${groupId}-${slugify(size.size || `size-${index + 1}`)}`)
      }
      flat.push({ ...Object.fromEntries(SHARED.map((field) => [field, group[field]])), id, groupId, size: size.size, price: size.price, inStock: size.inStock !== false, image: group.images?.[0] || '' })
    })
  }
  return flat
}

// The live catalogue is whatever the owner saved. Nothing is shipped as a stand-in.
export function mergeCatalog(saved) {
  const list = Array.isArray(saved?.products) ? saved.products : []
  return list.map(cleanProduct)
}

// A product can go in the cart only when it is shown, in stock and has a price.
export const canBuy = (product) => Boolean(product?.visible && product.inStock && product.price)

// "{phone}" -> the shop's phone. A line that needs a detail the owner has not filled in yet is left out,
// so customers never see a placeholder.
export function fillShopDetails(body, shop) {
  return String(body).split('\n').map((line) => {
    let missing = false
    const filled = line.replace(/\{(\w+)\}/g, (match, key) => {
      if (!SHOP_FIELDS.some((field) => field.key === key)) return match
      const value = String(shop?.[key] || '').trim()
      if (!value) missing = true
      return value
    })
    return missing ? null : filled
  }).filter((line) => line !== null).join('\n')
}

export function formatGhs(pesewas) {
  if (!Number.isInteger(pesewas)) return ''
  return `GHS ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// "120" or "120.50" -> 12050 pesewas; anything else -> null.
export function parseGhs(value) {
  const clean = String(value ?? '').replace(/[,\s]/g, '').replace(/^GHS/i, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const [whole, fraction = ''] = clean.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

// Problems that stop the admin editor from saving, in plain words.
export function checkSiteEdits(content, products) {
  const problems = []
  const key = String(content.checkout.paystackPublicKey || '').trim()
  if (key.startsWith('sk_')) problems.push('That is the Paystack SECRET key. Never paste it here. Use the public key (starts with pk_).')
  else if (key && !/^pk_(live|test)_[A-Za-z0-9]+$/.test(key)) problems.push('The Paystack public key should start with pk_live_ or pk_test_.')
  const names = content.categories.map((category) => category.name.trim().toLowerCase())
  if (names.some((name) => !name)) problems.push('Every category needs a name.')
  if (new Set(names).size !== names.length) problems.push('Two categories have the same name.')
  const ids = new Set()
  for (const product of products) {
    if (product.visible && !content.categories.some((category) => category.name === product.category)) {
      problems.push(product.category
        ? `"${product.name}" is in "${product.category}", which is no longer a category. Choose a category for it, or hide it.`
        : `Choose a category for "${product.name}" before showing it on the website.`)
    }
    if (!String(product.name).trim()) problems.push('Every product needs a name.')
    if (ids.has(product.id)) problems.push(`Two products share the ID "${product.id}".`)
    ids.add(product.id)
    if (product.visible && product.line === 'Skin concerns' && !String(product.cautions || '').trim()) {
      problems.push(`"${product.name}" is in "${lineLabel(content.lines || LINES, 'Skin concerns')}". Add its cautions (from the label) before showing it on the website.`)
    }
  }
  if (content.terms.sections.some((section) => !section.title.trim())) problems.push('Every terms section needs a title.')
  const needNames = (content.tags?.needs || []).map((need) => need.label.trim().toLowerCase())
  if (needNames.some((name) => !name)) problems.push('Every need needs a name.')
  if (new Set(needNames).size !== needNames.length) problems.push('Two needs have the same name.')
  if ((content.lines || []).some((line) => !String(line.label).trim())) problems.push('Every shop path needs a name.')
  return problems
}

const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product'

// Products are created as "new-product-<suffix>" before they have a name. The first time one is saved,
// give it an id (and so its web address) from its real name, keeping the unique suffix. Products that were
// saved before keep their id for ever, so links, stock and orders that point at them never break.
export function rekeyNewProducts(products, savedIds) {
  const taken = new Set(products.map((p) => p.id))
  return products.map((product) => {
    const match = /^new-product-([a-z0-9]+)$/.exec(product.id)
    if (!match || savedIds.has(product.id) || /^new product$/i.test(product.name.trim())) return product
    const id = `${slugify(product.name)}-${match[1]}`
    if (taken.has(id)) return product
    taken.delete(product.id)
    taken.add(id)
    return { ...product, id }
  })
}

// ---- Reviews ---------------------------------------------------------------------------------------
// Customers leave a review from a product (status "pending"); the owner approves it in Admin → Website →
// Reviews before anyone sees it. The owner can also enter a review a customer sent another way (WhatsApp),
// only with that customer's permission; those are marked source "owner". Stars shown on the website come only
// from approved reviews.
export const REVIEW_LIMITS = { name: 40, location: 40, text: 600 }

export function cleanReview(input) {
  const rating = Number(input?.rating)
  return {
    name: String(input?.name ?? '').trim().slice(0, REVIEW_LIMITS.name),
    location: String(input?.location ?? '').trim().slice(0, REVIEW_LIMITS.location),
    text: String(input?.text ?? '').trim().slice(0, REVIEW_LIMITS.text),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0,
    productId: String(input?.productId ?? '').slice(0, 80),
  }
}

// Problems with a review, in plain words ('' = fine).
export function checkReview(review) {
  if (!review.rating) return 'Choose how many stars to give.'
  if (review.name.length < 2) return 'Type your first name.'
  if (review.text.length < 10) return 'Write a few words about the product.'
  return ''
}

// { [productId]: { average, count } } from approved reviews only.
export function ratingsByProduct(reviews) {
  const totals = {}
  for (const review of reviews) {
    if (review.status !== 'approved' || !review.productId) continue
    const entry = totals[review.productId] || (totals[review.productId] = { sum: 0, count: 0 })
    entry.sum += review.rating
    entry.count += 1
  }
  return Object.fromEntries(Object.entries(totals).map(([id, { sum, count }]) => [id, { average: Math.round((sum / count) * 10) / 10, count }]))
}
