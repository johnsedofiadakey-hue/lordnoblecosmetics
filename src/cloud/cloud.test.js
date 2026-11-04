import { describe, expect, it } from 'vitest'
import { canBuy, checkReview, flattenGroups, groupProducts, cleanLayout, cleanLines, cleanTags, checkSiteEdits, cleanCategories, cleanRange, cleanReview, LORDINA_RANGE, ratingsByProduct, cleanProduct, DEFAULT_CONTENT, fillShopDetails, formatGhs, mergeCatalog, mergeContent, parseGhs, rekeyNewProducts } from './site.js'
import { cartLines, checkDetails, normalizeGhanaPhone, orderRequest, orderTotals, PAYMENT, paystackReference } from './orders.js'

const priced = [
  cleanProduct({ id: 'a', name: 'Royal Cream', price: 12000, category: 'Skin care', visible: true, inStock: true }),
  cleanProduct({ id: 'b', name: 'Body Oil', price: 8550, category: 'Skin care', visible: true, inStock: true }),
  cleanProduct({ id: 'c', name: 'Hidden', price: 5000, category: 'Skin care', visible: false }),
  cleanProduct({ id: 'd', name: 'No price', price: null, category: 'Skin care', visible: true }),
]

describe('site content', () => {
  it('uses the defaults when nothing is saved, and merges saved edits over them', () => {
    expect(mergeContent(null)).toEqual(DEFAULT_CONTENT)
    const merged = mergeContent({ shop: { phone: '0241234567' }, home: { heroAccent: 'every day.' }, terms: { sections: [{ title: 'A', body: 'B' }, { title: 1 }] } })
    expect(merged.shop.phone).toBe('0241234567')
    expect(merged.shop.email).toBe('')
    expect(merged.home.heroAccent).toBe('every day.')
    expect(merged.home.heroText).toBe(DEFAULT_CONTENT.home.heroText)
    expect(merged.terms.sections).toEqual([{ title: 'A', body: 'B' }])
  })

  it('updates only the previous starter hero while keeping owner edits', () => {
    const merged = mergeContent({ home: {
      heroTitle: 'Beauty Products\nfor a More',
      heroImage: '/campaign/hero-model.jpg',
      heroText: 'My own words',
      heroBadges: [{ icon: 'leaf', label: 'High quality ingredients' }, { icon: 'shield', label: 'Safe and gentle' }, { icon: 'lotus', label: 'Beauty for every woman' }],
    } })
    expect(merged.home.heroTitle).toBe(DEFAULT_CONTENT.home.heroTitle)
    expect(merged.home.heroImage).toBe(DEFAULT_CONTENT.home.heroImage)
    expect(merged.home.heroText).toBe('My own words')
    expect(merged.home.heroBadges).toEqual([])
  })

  it('refreshes the prior Lordina campaign copy without replacing owner words', () => {
    const merged = mergeContent({ home: {
      heroTitle: 'Luxury care for a naturally radiant glow.',
      heroText: 'Lordina Face Serum · 50mL',
      heroSecondTitle: 'A moment of care, made yours.',
      heroSecondText: 'A personal line from the owner.',
    } })
    expect(merged.home.heroTitle).toBe(DEFAULT_CONTENT.home.heroTitle)
    expect(merged.home.heroText).toBe(DEFAULT_CONTENT.home.heroText)
    expect(merged.home.heroSecondTitle).toBe(DEFAULT_CONTENT.home.heroSecondTitle)
    expect(merged.home.heroSecondText).toBe('A personal line from the owner.')
  })

  it('retires the old generic home claims while preserving owner-written copy', () => {
    const merged = mergeContent({ home: {
      topbar: ['Nationwide delivery (Ghana)', '100% authentic products', 'Beauty. Wellness. Confidence.'],
      whyItems: [{ icon: 'gem', label: 'Premium quality' }, { icon: 'truck', label: 'Fast and reliable delivery' }, { icon: 'shield', label: 'Secure payment' }, { icon: 'leaf', label: 'Carefully chosen products' }, { icon: 'heart', label: 'Loved by our customers' }],
      ctaTitle: 'Ready to Glow?',
      ctaText: 'Shop your favourite beauty products today and enjoy fast delivery anywhere in Ghana.',
      ctaAction: 'Shop Now',
    }, pages: { footerText: 'Beauty and wellness products, delivered' } })
    expect(merged.home.topbar).toEqual([])
    expect(merged.home.whyItems).toEqual([])
    expect(merged.home.ctaTitle).toBe(DEFAULT_CONTENT.home.ctaTitle)
    expect(merged.pages.footerText).toBe(DEFAULT_CONTENT.pages.footerText)
    const custom = mergeContent({ home: { topbar: ['My own announcement'], whyItems: [{ icon: 'leaf', label: 'My own promise' }], ctaTitle: 'My own invitation' }, pages: { footerText: 'Made with care' } })
    expect(custom.home.topbar).toEqual(['My own announcement'])
    expect(custom.home.whyItems).toEqual([{ icon: 'leaf', label: 'My own promise' }])
    expect(custom.home.ctaTitle).toBe('My own invitation')
    expect(custom.pages.footerText).toBe('Made with care')
  })

  it('keeps the five Lordina products in order and only takes the owner edits it knows', () => {
    const range = cleanRange([{ key: 'night', name: '  Night Lotion  ', productId: 'night-lotion', show: false, image: '' }, { key: 'bogus', name: 'Not ours' }])
    expect(range.map((item) => item.key)).toEqual(LORDINA_RANGE.map((item) => item.key))
    const night = range.find((item) => item.key === 'night')
    expect(night).toMatchObject({ name: 'Night Lotion', productId: 'night-lotion', show: false, image: LORDINA_RANGE[3].image, group: 'body' })
    expect(cleanRange(null)[0]).toEqual(LORDINA_RANGE[0])
    expect(mergeContent({ home: { heroTitle: 'Before the day asks anything of you.' } }).home.heroTitle).toBe(DEFAULT_CONTENT.home.heroTitle)
  })

  it('fills shop details into text and leaves out any line whose detail is still empty (no placeholders)', () => {
    expect(fillShopDetails('Call {phone}.\nEmail {email}.\nAlways shown.', { phone: '024 123 4567' })).toBe('Call 024 123 4567.\nAlways shown.')
    expect(fillShopDetails('Keep {unknown}', {})).toBe('Keep {unknown}')
    const terms = DEFAULT_CONTENT.terms.sections.map((section) => fillShopDetails(section.body, {})).join('\n')
    expect(terms).not.toMatch(/\{|\[/)
  })

  it('ships no stand-in products: an unsaved catalogue is empty', () => {
    expect(mergeCatalog(null)).toEqual([])
    const [product] = mergeCatalog({ products: [{ name: 'X', price: -5, category: 'Toys', line: 'Other' }] })
    expect(product).toMatchObject({ id: 'product-1', price: null, category: 'Toys', line: 'Everyday care', visible: false, inStock: true })
  })

  it('keeps the owner\'s categories in order, without blanks or repeats', () => {
    expect(cleanCategories([{ name: ' Hair ', text: 'For hair.' }, { name: 'hair' }, { name: '' }, { name: 'Nails' }]))
      .toEqual([{ name: 'Hair', text: 'For hair.', image: '', icon: 'flower' }, { name: 'Nails', text: '', image: '', icon: 'flower' }])
    expect(mergeContent({ categories: [{ name: 'Hair', icon: 'leaf', image: '/a.webp' }] }).categories).toEqual([{ name: 'Hair', text: '', image: '/a.webp', icon: 'leaf' }])
    expect(mergeContent({ categories: [] }).categories).toEqual([])
  })

  it('will not show a product whose category no longer exists', () => {
    const c = mergeContent({ categories: [{ name: 'Hair' }] })
    expect(checkSiteEdits(c, [cleanProduct({ id: 'a', name: 'Oil', category: 'Body care', visible: true })])[0]).toMatch(/no longer a category/)
    expect(checkSiteEdits(c, [cleanProduct({ id: 'a', name: 'Oil', category: 'Body care', visible: false })])).toEqual([])
    expect(checkSiteEdits(c, [cleanProduct({ id: 'a', name: 'Oil', category: 'Hair', visible: true })])).toEqual([])
  })

  it('keeps new products hidden until the owner shows them', () => {
    expect(cleanProduct({ id: 'x', name: 'New' }).visible).toBe(false)
    expect(cleanProduct({ id: 'x', name: 'New', visible: true }).visible).toBe(true)
  })

  it('only sells products that are shown, in stock and priced', () => {
    expect(priced.map(canBuy)).toEqual([true, true, false, false])
  })

  it('reads and formats cedis as whole pesewas', () => {
    expect(parseGhs('120')).toBe(12000)
    expect(parseGhs('1,250.5')).toBe(125050)
    expect(parseGhs('GHS 85.50')).toBe(8550)
    expect(parseGhs('12.345')).toBeNull()
    expect(parseGhs('abc')).toBeNull()
    expect(formatGhs(125050)).toBe('GHS 1,250.50')
  })
})

describe('website orders', () => {
  it('accepts Ghana phone numbers in common forms', () => {
    expect(normalizeGhanaPhone('0241234567')).toBe('024 123 4567')
    expect(normalizeGhanaPhone('+233 24 123 4567')).toBe('024 123 4567')
    expect(normalizeGhanaPhone('12345')).toBeNull()
  })

  it('explains what is missing in plain words', () => {
    const errors = checkDetails({ name: 'A', phone: '1', method: 'delivery', address: '' }, { needEmail: true })
    expect(Object.keys(errors).sort()).toEqual(['address', 'email', 'name', 'phone'])
    expect(checkDetails({ name: 'Ama K', phone: '0241234567', method: 'pickup', email: 'ama@example.com' }, { needEmail: true })).toEqual({})
    expect(checkDetails({ name: 'Ama K', phone: '0241234567', method: 'delivery', address: 'East Legon, near the mall' }, { delivery: false }).method).toMatch(/pickup/)
  })

  it('keeps only buyable products, caps quantities and totals in pesewas', () => {
    const lines = cartLines({ a: 2, b: 99, c: 1, d: 1, gone: 3 }, priced)
    expect(lines.map((line) => [line.id, line.qty, line.lineTotal])).toEqual([['a', 2, 24000], ['b', 20, 171000]])
    expect(orderTotals(lines, 'pickup', 2000)).toEqual({ subtotal: 195000, deliveryFee: 0, total: 195000 })
    expect(orderTotals(lines, 'delivery', 2000)).toEqual({ subtotal: 195000, deliveryFee: 2000, total: 197000 })
    expect(orderTotals(lines, 'delivery', null)).toEqual({ subtotal: 195000, deliveryFee: null, total: 195000 })
  })

  it('sends the server only ids, quantities and details (never prices)', () => {
    const request = orderRequest({
      requestId: 'req-12345678',
      cart: { a: 1, b: 99 },
      products: priced,
      details: { name: ' Ama K ', phone: '0241234567', email: '', method: 'pickup', address: 'ignored', notes: 'Call first' },
      payment: PAYMENT.paystack,
    })
    expect(request).toEqual({ requestId: 'req-12345678', payment: 'paystack', details: { name: 'Ama K', phone: '0241234567', email: '', method: 'pickup', address: 'ignored', notes: 'Call first' }, lines: [{ id: 'a', qty: 1 }, { id: 'b', qty: 20 }] })
  })

  it('keeps the product image with each new website order line', () => {
    const lines = cartLines({ a: 1 }, [{ ...priced[0], image: 'https://images.example/serum.png' }])
    expect(lines[0].image).toBe('https://images.example/serum.png')
  })

  it('makes a fresh Paystack reference for each payment attempt on an order', () => {
    let n = 0
    expect(paystackReference('AT-ABC234', () => n++)).toBe('AT-ABC234-ABCD')
    expect(paystackReference('AT-ABC234')).toMatch(/^AT-ABC234-[A-HJ-NP-Z2-9]{4}$/)
  })
})

describe('admin website editor', () => {
  const content = () => mergeContent({ categories: [{ name: 'Skin care' }] })
  it('refuses a Paystack secret key and odd public keys', () => {
    const c = content()
    c.checkout.paystackPublicKey = 'sk_live_abc123'
    expect(checkSiteEdits(c, priced)[0]).toMatch(/SECRET/)
    c.checkout.paystackPublicKey = 'hello'
    expect(checkSiteEdits(c, priced)[0]).toMatch(/pk_live_/)
    c.checkout.paystackPublicKey = 'pk_test_abc123'
    expect(checkSiteEdits(c, priced)).toEqual([])
  })
  it('needs product names, unique ids and section titles', () => {
    const c = content()
    c.terms.sections = [{ title: ' ', body: 'x' }]
    const problems = checkSiteEdits(c, [cleanProduct({ id: 'a', name: 'A' }), { ...cleanProduct({ id: 'a' }), name: '' }])
    expect(problems).toEqual(expect.arrayContaining(['Every product needs a name.', 'Two products share the ID "a".', 'Every terms section needs a title.']))
  })
  it('will not show a skin-concerns product on the website without its cautions', () => {
    const product = cleanProduct({ id: 'dc', name: 'Targeted Cream', category: 'Skin care', line: 'Skin concerns', visible: true, price: 5000 })
    expect(checkSiteEdits(content(), [product])[0]).toMatch(/cautions/)
    expect(checkSiteEdits(content(), [{ ...product, cautions: 'For external use only.' }])).toEqual([])
    expect(checkSiteEdits(content(), [{ ...product, visible: false }])).toEqual([])
  })
})

describe('new product ids', () => {
  const draft = (id, name) => ({ id, name })
  it('names a never-saved product from its real name, keeping the unique suffix', () => {
    expect(rekeyNewProducts([draft('new-product-abc12', 'Royal Cream')], new Set()).map((p) => p.id)).toEqual(['royal-cream-abc12'])
  })
  it('never changes an id that was already saved', () => {
    expect(rekeyNewProducts([draft('new-product-abc12', 'Royal Cream')], new Set(['new-product-abc12']))[0].id).toBe('new-product-abc12')
    expect(rekeyNewProducts([draft('royal-cream-x1', 'Renamed Cream')], new Set())[0].id).toBe('royal-cream-x1')
  })
  it('leaves a product still called "New product" and avoids clashes', () => {
    expect(rekeyNewProducts([draft('new-product-a1', 'New product')], new Set())[0].id).toBe('new-product-a1')
    const both = rekeyNewProducts([draft('new-product-a1', 'Cream'), draft('cream-a1', 'Cream')], new Set(['cream-a1']))
    expect(both.map((p) => p.id)).toEqual(['new-product-a1', 'cream-a1'])
  })
})

describe('reviews', () => {
  it('cleans and checks what a customer types', () => {
    const review = cleanReview({ name: '  Ama ', location: 'Kumasi', text: 'Lovely cream, my skin feels soft.', rating: '5', productId: 'royal-cream' })
    expect(review).toEqual({ name: 'Ama', location: 'Kumasi', text: 'Lovely cream, my skin feels soft.', rating: 5, productId: 'royal-cream' })
    expect(checkReview(review)).toBe('')
    expect(checkReview(cleanReview({ ...review, rating: 9 }))).toMatch(/stars/)
    expect(checkReview(cleanReview({ ...review, text: 'ok' }))).toMatch(/few words/)
  })

  it('counts stars from approved reviews only', () => {
    const ratings = ratingsByProduct([
      { productId: 'a', rating: 5, status: 'approved' },
      { productId: 'a', rating: 4, status: 'approved' },
      { productId: 'a', rating: 1, status: 'pending' },
      { productId: 'b', rating: 2, status: 'rejected' },
    ])
    expect(ratings).toEqual({ a: { average: 4.5, count: 2 } })
  })
})

describe('owner-editable lists and layout', () => {
  it('keeps tags unique and starts from the shipped lists', () => {
    expect(cleanTags(null).needs[0]).toEqual({ label: 'Dark spots', description: 'For the look of dark spots and marks.' })
    const tags = cleanTags({ needs: [{ label: ' Hair growth ', description: 'x' }, { label: 'hair growth' }, { label: '' }], ingredients: ['Shea butter', 'shea butter', 'Castor oil'] })
    expect(tags).toEqual({ needs: [{ label: 'Hair growth', description: 'x' }], ingredients: ['Shea butter', 'Castor oil'] })
  })

  it('renames shop paths but keeps their ids', () => {
    const lines = cleanLines([{ id: 'Skin concerns', label: 'Targeted care' }, { id: 'Made up', label: 'Nope' }])
    expect(lines.map((line) => [line.id, line.label])).toEqual([['Everyday care', 'Everyday care'], ['Skin concerns', 'Targeted care']])
  })

  it('keeps every home section and menu link exactly once, in the owner\'s order', () => {
    const layout = cleanLayout({ sections: [{ key: 'cta', show: false }, { key: 'cta' }, { key: 'bogus' }], menu: [{ key: 'contact', label: 'Call us' }] })
    expect(layout.sections.map((section) => `${section.key}:${section.show}`)).toEqual(['cta:false', 'explore:true', 'loved:true', 'why:true', 'reviews:true'])
    expect(layout.menu[0]).toEqual({ key: 'contact', label: 'Call us', show: true })
    expect(layout.menu).toHaveLength(6)
  })
})

describe('products with several sizes and photos', () => {
  const flat = [
    cleanProduct({ id: 'royal-cream', groupId: 'royal-cream', name: 'Royal Cream', size: '50 g', price: 25000, images: ['/a.webp', '/b.webp'], visible: true }),
    cleanProduct({ id: 'royal-cream-100-g', groupId: 'royal-cream', name: 'Royal Cream', size: '100 g', price: 42000, images: ['/a.webp', '/b.webp'], visible: true }),
    cleanProduct({ id: 'oil', name: 'Body Oil', size: '240 ml', price: 9000, image: '/oil.webp', visible: true }),
  ]

  it('keeps the first photo as the main image, and older single-photo items keep working', () => {
    expect(flat[0].image).toBe('/a.webp')
    expect(flat[2].images).toEqual(['/oil.webp'])
  })

  it('shows sizes of one product together, priced from the cheapest', () => {
    const [cream, oil] = groupProducts(flat)
    expect(cream.sizes.map((size) => `${size.id}:${size.size}:${size.price}`)).toEqual(['royal-cream:50 g:25000', 'royal-cream-100-g:100 g:42000'])
    expect([cream.price, cream.maxPrice]).toEqual([25000, 42000])
    expect(oil.id).toBe('oil')
    expect(oil.sizes).toHaveLength(1)
  })

  it('round-trips without changing saved ids, and names new products and sizes', () => {
    const saved = new Set(flat.map((product) => product.id))
    expect(flattenGroups(groupProducts(flat), saved).map((product) => product.id)).toEqual(['royal-cream', 'royal-cream-100-g', 'oil'])
    const [cream] = groupProducts(flat)
    cream.sizes.push({ id: 'new-size-x1', size: '200 g', price: 70000 })
    const fresh = { ...cream, id: 'new-product-abc', name: 'Shea Butter', sizes: [{ id: 'new-product-abc', size: '250 g', price: 5000 }, { id: 'new-size-y2', size: '500 g', price: 9000 }] }
    const ids = flattenGroups([cream, fresh], saved).map((product) => `${product.id}<${product.groupId}`)
    expect(ids).toEqual(['royal-cream<royal-cream', 'royal-cream-100-g<royal-cream', 'royal-cream-200-g<royal-cream', 'shea-butter-abc<shea-butter-abc', 'shea-butter-abc-500-g<shea-butter-abc'])
  })
})
