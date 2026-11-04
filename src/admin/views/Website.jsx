import { useCallback, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore/lite'
import { db } from '../../cloud/firebase.js'
import { checkReview, cleanProduct, cleanReview, HOME_SECTIONS, RANGE_GROUPS, ICON_CHOICES, MAX_TAGS, groupProducts, mergeCatalog, MAX_CATEGORIES, mergeContent, parseGhs, SHOP_FIELDS } from '../../cloud/site.js'
import { checkLogo, checkSitePhoto, uploadLogo, uploadSitePhoto } from '../live/storage.js'
import { EditorGate } from '../cloud.jsx'
import { Card, Icon, Pill, Segmented } from '../components/ui.jsx'
import { useOps } from '../hooks.js'

const TABS = [
  { value: 'shop', label: 'Shop details' },
  { value: 'home', label: 'Home page' },
  { value: 'categories', label: 'Categories' },
  { value: 'tags', label: 'Tags and paths' },
  { value: 'layout', label: 'Layout and menu' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'about', label: 'About page' },
  { value: 'checkout', label: 'Checkout and payment' },
  { value: 'terms', label: 'Terms' },
]

// Problems with the website content that stop it saving, in plain words.
function checkContent(content) {
  const problems = []
  const key = String(content.checkout.paystackPublicKey || '').trim()
  if (key.startsWith('sk_')) problems.push('That is the Paystack SECRET key. Never paste it here. Use the public key (starts with pk_).')
  else if (key && !/^pk_(live|test)_[A-Za-z0-9]+$/.test(key)) problems.push('The Paystack public key should start with pk_live_ or pk_test_.')
  const names = content.categories.map((category) => category.name.trim().toLowerCase())
  if (names.some((name) => !name)) problems.push('Every category needs a name.')
  if (new Set(names).size !== names.length) problems.push('Two categories have the same name.')
  const needNames = content.tags.needs.map((need) => need.label.trim().toLowerCase())
  if (needNames.some((name) => !name)) problems.push('Every need needs a name.')
  if (new Set(needNames).size !== needNames.length) problems.push('Two needs have the same name.')
  if (content.lines.some((line) => !String(line.label).trim())) problems.push('Every shop path needs a name.')
  if (content.terms.sections.some((section) => !section.title.trim())) problems.push('Every terms section needs a title.')
  return problems
}

const toCedis = (pesewas) => (Number.isInteger(pesewas) ? (pesewas / 100).toFixed(2) : '')
const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product'

export default function Website() {
  return <div className="stack website-editor">
    <p className="muted">Change the logo, photos, words, categories, reviews and terms on the public website. Products, prices and photos of products are on the <a href="#/products">Products</a> page.</p>
    <EditorGate purpose="Only the owner can change the public website.">{(user) => <Editor user={user} />}</EditorGate>
  </div>
}

function Editor({ user }) {
  const { toast } = useOps()
  const [tab, setTab] = useState('shop')
  const [content, setContent] = useState(null)
  // Products themselves are edited on the Products page. Here they are only read, so that renaming or removing
  // a category or tag can move the products that use it; `loaded` is how they were when this page opened.
  const [products, setProducts] = useState(null)
  const [loaded, setLoaded] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    Promise.all([getDoc(doc(db, 'site', 'content')), getDoc(doc(db, 'site', 'catalog'))])
      .then(([c, k]) => {
        const catalog = mergeCatalog(k.exists() ? k.data() : null)
        setContent(mergeContent(c.exists() ? c.data() : null))
        setProducts(groupProducts(catalog))
        setLoaded(groupProducts(catalog))
      })
      .catch(() => toast('Could not load the website content. Check your internet and reload.', 'error'))
  }, [toast])

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!content || !products) return <p className="muted">Loading the website content…</p>

  const edit = (part, key, value) => { setContent({ ...content, [part]: { ...content[part], [key]: value } }); setDirty(true) }
  // Products whose category, needs or key ingredients changed here (through a rename or removal).
  const moved = () => {
    const TAGGED = ['category', 'needs', 'ingredients']
    const before = new Map(loaded.map((group) => [group.id, group]))
    return new Map(products.filter((group) => TAGGED.some((field) => JSON.stringify(group[field]) !== JSON.stringify(before.get(group.id)?.[field])))
      .map((group) => [group.id, { category: group.category, needs: group.needs, ingredients: group.ingredients }]))
  }

  const save = async () => {
    const problems = checkContent(content)
    if (problems.length) { toast(problems[0], 'error'); return }
    setSaving(true)
    const stamp = { updatedAt: serverTimestamp(), updatedBy: user.uid }
    const changes = moved()
    try {
      await setDoc(doc(db, 'site', 'content'), { shop: content.shop, brand: content.brand, categories: content.categories, home: content.home, about: content.about, tags: content.tags, lines: content.lines, layout: content.layout, pages: content.pages, checkout: content.checkout, terms: content.terms, ...stamp })
      // Apply only those fields to the latest saved products, so edits made on the Products page are kept.
      if (changes.size) {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, 'site', 'catalog')
          const snap = await tx.get(ref)
          const current = mergeCatalog(snap.exists() ? snap.data() : null)
          tx.set(ref, { products: current.map((product) => ({ ...product, ...(changes.get(product.groupId || product.id) || {}) })).map(cleanProduct), ...stamp })
        })
      }
      setLoaded(products)
      setDirty(false)
      toast('Saved. The website shows the change now (visitors may need to reload).')
    } catch {
      toast('Could not save. Check your internet and try again.', 'error')
    }
    setSaving(false)
  }

  return <>
    <div className="website-toolbar">
      <div className="website-tabs-wide"><Segmented label="Part of the website" value={tab} onChange={setTab} options={TABS} /></div>
      {/* Phones: one drop-down instead of eleven buttons. */}
      <label className="field website-tabs-narrow"><span>Part of the website</span>
        <select value={tab} onChange={(event) => setTab(event.target.value)}>{TABS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      </label>
      <div className="row">
        <a className="btn ghost" href="/" target="_blank" rel="noreferrer">Open website</a>
        <button type="button" className="btn primary" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
    </div>
    {tab === 'shop' ? <>
      <LogoCard brand={content.brand} onChange={(key, value) => edit('brand', key, value)} />
      <ShopTab shop={content.shop} onChange={(key, value) => edit('shop', key, value)} />
    </> : null}
    {tab === 'home' ? <HomeTab home={content.home} products={products} onChange={(key, value) => edit('home', key, value)} /> : null}
    {tab === 'categories' ? <CategoriesTab categories={content.categories} products={products} onChange={(categories, nextProducts) => {
      setContent({ ...content, categories })
      if (nextProducts) setProducts(nextProducts)
      setDirty(true)
    }} /> : null}
    {tab === 'tags' ? <TagsTab tags={content.tags} lines={content.lines} products={products} onChange={(patch, nextProducts) => {
      setContent({ ...content, ...patch })
      if (nextProducts) setProducts(nextProducts)
      setDirty(true)
    }} /> : null}
    {tab === 'layout' ? <LayoutTab layout={content.layout} pages={content.pages} onLayout={(layout) => { setContent({ ...content, layout }); setDirty(true) }} onPage={(key, value) => edit('pages', key, value)} /> : null}
    {tab === 'reviews' ? <ReviewsTab user={user} products={products} /> : null}
    {tab === 'about' ? <AboutTab about={content.about} onChange={(key, value) => edit('about', key, value)} /> : null}
    {tab === 'checkout' ? <CheckoutTab checkout={content.checkout} onChange={(key, value) => edit('checkout', key, value)} /> : null}
    {tab === 'terms' ? <TermsTab terms={content.terms} onChange={(terms) => { setContent({ ...content, terms }); setDirty(true) }} /> : null}
    {/* Always in reach while there are unsaved changes, however far down the page you are. */}
    {dirty ? <div className="save-bar" role="region" aria-label="Unsaved changes">
      <span><Icon name="alert" size={16} /> You have changes that are not on the website yet.</span>
      <button type="button" className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </div> : null}
  </>
}

function TextField({ label, hint, value, onChange, multiline = false, ...rest }) {
  return <label className="field">
    <span>{label}{hint ? <em className="muted small"> · {hint}</em> : null}</span>
    {multiline ? <textarea rows={multiline === true ? 3 : multiline} value={value} onChange={(event) => onChange(event.target.value)} {...rest} /> : <input value={value} onChange={(event) => onChange(event.target.value)} {...rest} />}
  </label>
}

const SHOP_HINTS = {
  legalName: 'exactly as registered with the Registrar-General',
  whatsapp: 'e.g. 024 123 4567',
  deliveryAreas: 'e.g. Accra and Tema',
  deliveryTime: 'e.g. 1 to 2 days',
  returnDays: 'a number, e.g. 7',
  refundDays: 'a number, e.g. 5',
  instagram: 'full link, starting with https://',
  tiktok: 'full link, starting with https://',
  facebook: 'full link, starting with https://',
}

function ShopTab({ shop, onChange }) {
  const missing = SHOP_FIELDS.filter((field) => !['instagram', 'tiktok', 'facebook'].includes(field.key) && !String(shop[field.key] || '').trim())
  return <Card title="Shop details">
    <div className="stack">
      {missing.length ? <div className="callout warn"><Icon name="alert" /><p>Still empty, so the website leaves them out (and skips any terms sentence that needs them): {missing.map((field) => field.label).join(', ')}.</p></div> : <p className="good-text">All shop details are filled in.</p>}
      <p className="muted small">These appear in the footer, at checkout and inside the terms.</p>
      <div className="grid-2">{SHOP_FIELDS.map((field) => <TextField key={field.key} label={field.label} hint={SHOP_HINTS[field.key]} value={shop[field.key] || ''} onChange={(value) => onChange(field.key, value)} />)}</div>
    </div>
  </Card>
}

const ICON_LABELS = { flower: 'Flower', body: 'Body', face: 'Face', leaf: 'Leaf', tools: 'Tools', drop: 'Drop', sparkles: 'Sparkles', heart: 'Heart', gem: 'Gem', shield: 'Shield', truck: 'Delivery truck', star: 'Star', gift: 'Gift', sun: 'Sun', lotus: 'Lotus', bag: 'Shopping bag' }

function IconSelect({ label = 'Icon', value, onChange }) {
  return <label className="field"><span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>{ICON_CHOICES.map((name) => <option key={name} value={name}>{ICON_LABELS[name] || name}</option>)}</select>
  </label>
}

// A photo for the website (hero, category card, closing banner, About page), uploaded to Storage.
function SitePhotoField({ label, hint, kind, value, onChange, allowRemove = true }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const problem = checkSitePhoto(file)
    if (problem) { setNote(problem); return }
    setBusy(true); setNote('')
    try {
      onChange(await uploadSitePhoto(kind, file))
      setNote('Photo uploaded. Press “Save changes” to put it on the website.')
    } catch (error) {
      setNote(error instanceof Error && error.message ? `Could not upload: ${error.message}` : 'Could not upload the photo. Check your internet and try again.')
    }
    setBusy(false)
  }
  return <div className="stack site-photo-field">
    <span className="field-label">{label}{hint ? <em className="muted small"> · {hint}</em> : null}</span>
    <div className="site-photo-preview">{value ? <img src={value} alt="" /> : <span className="muted small">No photo yet.</span>}</div>
    <div className="row">
      <label className="btn"><Icon name="plus" size={16} /> {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} hidden /></label>
      {value && allowRemove ? <button type="button" className="btn ghost" onClick={() => { onChange(''); setNote('Photo removed. Press “Save changes” to update the website.') }}>Remove</button> : null}
    </div>
    {note ? <p className={note.startsWith('Photo uploaded') || note.startsWith('Photo removed') ? 'good-text' : 'bad-text'} role="status">{note}</p> : null}
  </div>
}

// A short list of icon + words (hero promises, "Why shop" items).
function IconItems({ items, count, onChange }) {
  const list = Array.from({ length: count }, (_, i) => items?.[i] || { icon: ICON_CHOICES[0], label: '' })
  const set = (index, patch) => onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  return <div className="stack">{list.map((item, index) => <div className="grid-2" key={index}>
    <IconSelect label={`Icon ${index + 1}`} value={item.icon} onChange={(value) => set(index, { icon: value })} />
    <TextField label={`Words ${index + 1}`} hint="leave empty to hide" value={item.label} onChange={(value) => set(index, { label: value })} maxLength={40} />
  </div>)}</div>
}

const HOME_GROUPS = [
  { title: 'Hero: words', fields: [
    ['heroKicker', 'Small label above the headline', 40], ['heroTitle', 'Headline', 100, 2], ['heroAccent', 'Optional words in gold', 40],
    ['heroText', 'Text under the headline', 220, 3], ['heroAction', 'Order button (orders the face serum)', 30],
  ] },
  { title: 'Our most loved products', note: 'Tick “Best seller” on a product (Products tab) to show it here.', fields: [
    ['bestKicker', 'Small label above', 40], ['bestTitle', 'Heading', 60],
  ] },
  { title: 'Customer reviews', note: 'Only reviews you approve in the Reviews tab are shown. The section stays hidden until there is one.', fields: [
    ['reviewsKicker', 'Small label above', 40], ['reviewsTitle', 'Heading', 60],
  ] },
  { title: 'Closing banner', fields: [
    ['ctaTitle', 'Heading', 40], ['ctaText', 'Text', 200, 2], ['ctaAction', 'Button', 30],
  ] },
]

function HomeTab({ home, products, onChange }) {
  const field = ([key, label, max, multiline]) => <TextField key={key} label={label} value={home[key] || ''} onChange={(value) => onChange(key, value)} maxLength={max} multiline={multiline || false} />
  const topbar = Array.from({ length: 3 }, (_, i) => home.topbar?.[i] || '')
  return <div className="stack">
    <Card title="Top bar (the thin strip above the menu)">
      <div className="stack">
        <p className="muted small">Only say what is true, for example only promise nationwide delivery if you deliver everywhere. Leave a line empty to hide it.</p>
        <div className="grid-2">{topbar.map((value, i) => <TextField key={i} label={`Message ${i + 1}`} value={value} maxLength={50} onChange={(next) => onChange('topbar', topbar.map((item, j) => (j === i ? next : item)))} />)}</div>
      </div>
    </Card>
    <Card title={HOME_GROUPS[0].title}><div className="grid-2">{HOME_GROUPS[0].fields.map(field)}</div></Card>
    <Card title="Hero: main portrait">
      <div className="grid-2">
        <SitePhotoField label="Hero photo" hint="required portrait image with the face and product visible" kind="hero" value={home.heroImage} onChange={(value) => onChange('heroImage', value)} allowRemove={false} />
        <TextField label="Describe the photo (for screen readers)" value={home.heroImageAlt || ''} onChange={(value) => onChange('heroImageAlt', value)} maxLength={120} />
      </div>
    </Card>
    <Card title="Face cream scene (under the hero)">
      <div className="stack">
        <div className="grid-2">
          <SitePhotoField label="Second portrait" hint="shown beside the ritual text; removing it hides this scene" kind="hero-second" value={home.heroSecondImage} onChange={(value) => onChange('heroSecondImage', value)} />
          <TextField label="Describe the photo (for screen readers)" value={home.heroSecondImageAlt || ''} onChange={(value) => onChange('heroSecondImageAlt', value)} maxLength={120} />
        </div>
        <div className="grid-2">
          {field(['heroSecondKicker', 'Small label', 40])}
          {field(['heroSecondTitle', 'Heading', 100, 2])}
          {field(['heroSecondText', 'Text', 220, 3])}
          {field(['heroSecondAction', 'Order button (orders the face cream)', 30])}
        </div>
      </div>
    </Card>
    <RangeCard home={home} products={products} onChange={onChange} />
    {HOME_GROUPS.slice(1, 2).map((group) => <Card key={group.title} title={group.title}>
      <div className="stack">{group.note ? <p className="muted small">{group.note}</p> : null}<div className="grid-2">{group.fields.map(field)}</div></div>
    </Card>)}
    <Card title="Why shop with us (the dark band)">
      <div className="stack">
        <div className="grid-2">{field(['whyTitle', 'Heading', 30])}{field(['whyAccent', 'Heading, second line', 30])}</div>
        <IconItems items={home.whyItems} count={5} onChange={(value) => onChange('whyItems', value)} />
      </div>
    </Card>
    {HOME_GROUPS.slice(2).map((group) => <Card key={group.title} title={group.title}>
      <div className="stack">{group.note ? <p className="muted small">{group.note}</p> : null}<div className="grid-2">{group.fields.map(field)}</div>
        {group.title === 'Closing banner' ? <SitePhotoField label="Banner photo" hint="shown on the left, e.g. your shopping bag" kind="banner" value={home.ctaImage} onChange={(value) => onChange('ctaImage', value)} /> : null}
      </div>
    </Card>)}
  </div>
}

// The Lordina range on the home page. Linking an item to a product shows its price and Add to Cart; without a
// link customers get an "Order on WhatsApp" button with the product name typed for them.
function RangeCard({ home, products, onChange }) {
  const range = home.range || []
  const set = (key, patch) => onChange('range', range.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  return <Card title="Lordina range">
    <div className="stack">
      <div className="grid-2">
        <TextField label="Heading" value={home.rangeTitle || ''} onChange={(value) => onChange('rangeTitle', value)} maxLength={60} />
        <TextField label="Text under the heading" value={home.rangeText || ''} onChange={(value) => onChange('rangeText', value)} maxLength={200} multiline />
      </div>
      <TextField label="Advice box under the products (leave empty to hide)" value={home.rangeNote || ''} onChange={(value) => onChange('rangeNote', value)} maxLength={240} multiline />
      <p className="muted small">Keep names and claims the same as the packaging. Link each product to the Products page so its price and Add to Cart show; without a link, customers see “Order on WhatsApp”.</p>
      {range.map((item) => <div key={item.key} className="stack">
        <b>{RANGE_GROUPS.find((group) => group.id === item.group)?.label}: {item.name}</b>
        <label className="check"><input type="checkbox" checked={item.show !== false} onChange={(event) => set(item.key, { show: event.target.checked })} /> Show on the website</label>
        <div className="grid-2">
          <TextField label="Name" value={item.name} onChange={(value) => set(item.key, { name: value })} maxLength={80} />
          <TextField label="Size" hint="e.g. 50mL" value={item.size} onChange={(value) => set(item.key, { size: value })} maxLength={20} />
          <TextField label="When to use it (small tag)" hint="e.g. Morning" value={item.use} onChange={(value) => set(item.key, { use: value })} maxLength={40} />
          <label className="field"><span>Product on the Products page</span>
            <select value={item.productId || ''} onChange={(event) => set(item.key, { productId: event.target.value })}>
              <option value="">Not linked (order on WhatsApp)</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        </div>
        <TextField label="One or two lines about it" value={item.text} onChange={(value) => set(item.key, { text: value })} maxLength={200} multiline />
        <SitePhotoField label="Photo" hint="the product with its box, on a white background" kind={`range-${item.key}`} value={item.image} onChange={(value) => set(item.key, { image: value })} allowRemove={false} />
      </div>)}
    </div>
  </Card>
}

function AboutTab({ about, onChange }) {
  return <Card title="About Us page">
    <div className="stack">
      <TextField label="Heading" value={about.title} onChange={(value) => onChange('title', value)} maxLength={60} />
      <TextField label="Your story" hint="in your own words; leave an empty line between paragraphs" multiline={10} value={about.text} onChange={(value) => onChange('text', value)} maxLength={4000} />
      <div className="grid-2">
        <SitePhotoField label="Photo" hint="optional, e.g. you or your shop" kind="about" value={about.image} onChange={(value) => onChange('image', value)} />
        <TextField label="Describe the photo (for screen readers)" value={about.imageAlt} onChange={(value) => onChange('imageAlt', value)} maxLength={120} />
      </div>
      {about.text.trim() ? null : <p className="muted small">Until your story is written, the About page shows only your shop details.</p>}
    </div>
  </Card>
}

const STARS = (rating) => '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating)

// Reviews take effect straight away (no "Save changes"): approving shows a review, hiding takes it off.
function ReviewsTab({ user, products }) {
  const { toast } = useOps()
  const [reviews, setReviews] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [draft, setDraft] = useState({ name: '', location: '', text: '', rating: 5, productId: '', permission: false })
  const [adding, setAdding] = useState(false)
  const load = useCallback(() => getDocs(collection(db, 'reviews'))
    .then((snapshot) => setReviews(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))))
    .catch(() => toast('Could not load the reviews. Check your internet and reload.', 'error')), [toast])
  useEffect(() => { load() }, [load])
  if (!reviews) return <p className="muted">Loading the reviews…</p>

  const productName = (id) => products.find((product) => product.id === id)?.name || (id ? 'A product no longer listed' : 'The shop in general')
  const setStatus = async (review, status) => {
    try {
      await updateDoc(doc(db, 'reviews', review.id), { status, reviewedAt: serverTimestamp(), reviewedBy: user.uid })
      toast(status === 'approved' ? 'Approved. It is on the website now.' : status === 'rejected' ? 'Hidden from the website.' : 'Moved back to waiting.')
      load()
    } catch { toast('Could not change the review. Try again.', 'error') }
  }
  const add = async (event) => {
    event.preventDefault()
    const review = cleanReview(draft)
    const problem = checkReview(review)
    if (problem) { toast(problem, 'error'); return }
    if (!draft.permission) { toast('Tick that the customer agreed to have their review on the website.', 'error'); return }
    setAdding(true)
    try {
      await addDoc(collection(db, 'reviews'), { ...review, status: 'approved', source: 'owner', permission: true, enteredBy: user.uid, createdAt: serverTimestamp() })
      setDraft({ name: '', location: '', text: '', rating: 5, productId: '', permission: false })
      toast('Review added and shown on the website.')
      load()
    } catch { toast('Could not add the review. Try again.', 'error') }
    setAdding(false)
  }
  const counts = { pending: 0, approved: 0, rejected: 0 }
  reviews.forEach((review) => { counts[review.status] = (counts[review.status] || 0) + 1 })
  const shown = reviews.filter((review) => review.status === filter)

  return <div className="stack">
    <p className="muted">Customers leave reviews from a product on the website. Nobody sees a review until you approve it, and the stars on the website come only from approved reviews. You cannot change a customer's words, only show or hide them.</p>
    <Segmented label="Reviews to show" value={filter} onChange={setFilter} options={[{ value: 'pending', label: 'Waiting', count: counts.pending }, { value: 'approved', label: 'On website', count: counts.approved }, { value: 'rejected', label: 'Hidden', count: counts.rejected }]} />
    {shown.length ? shown.map((review) => <Card key={review.id} title={<span><span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{STARS(review.rating)}</span> {review.name}{review.location ? `, ${review.location}` : ''} {review.source === 'owner' ? <Pill tone="grey">Entered by you</Pill> : null}</span>}>
      <div className="stack">
        <p>“{review.text}”</p>
        <p className="muted small">{productName(review.productId)}{review.createdAt?.seconds ? ` · ${new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
        <div className="row">
          {review.status !== 'approved' ? <button type="button" className="btn primary" onClick={() => setStatus(review, 'approved')}>Approve and show</button> : null}
          {review.status !== 'rejected' ? <button type="button" className="btn" onClick={() => setStatus(review, 'rejected')}>Hide</button> : null}
          {review.status === 'rejected' ? <button type="button" className="btn ghost" onClick={() => setStatus(review, 'pending')}>Move back to waiting</button> : null}
        </div>
      </div>
    </Card>) : <p className="muted">{filter === 'pending' ? 'No reviews waiting.' : filter === 'approved' ? 'No reviews on the website yet.' : 'No hidden reviews.'}</p>}
    <Card title="Add a review a customer sent you (for example on WhatsApp)">
      <form className="stack" onSubmit={add}>
        <div className="grid-2">
          <TextField label="Customer's first name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} maxLength={40} />
          <TextField label="Town" hint="optional, e.g. Kumasi" value={draft.location} onChange={(value) => setDraft({ ...draft, location: value })} maxLength={40} />
          <label className="field"><span>Product</span><select value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })}><option value="">The shop in general</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="field"><span>Stars</span><select value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{STARS(n)} ({n})</option>)}</select></label>
        </div>
        <TextField label="Their words, exactly as they wrote them" multiline={3} value={draft.text} onChange={(value) => setDraft({ ...draft, text: value })} maxLength={600} />
        <label className="check"><input type="checkbox" checked={draft.permission} onChange={(event) => setDraft({ ...draft, permission: event.target.checked })} /> The customer agreed to have this review and their first name on the website.</label>
        <div><button type="submit" className="btn" disabled={adding}><Icon name="plus" size={16} /> {adding ? 'Adding…' : 'Add review'}</button></div>
      </form>
    </Card>
  </div>
}

function LogoField({ label, hint, value, dark, onChange }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const problem = checkLogo(file)
    if (problem) { setNote(problem); return }
    setBusy(true); setNote('')
    try {
      onChange(await uploadLogo(dark ? 'light' : 'dark', file))
      setNote('Logo uploaded. Press “Save changes” to put it on the website.')
    } catch (error) {
      setNote(error instanceof Error && error.message ? `Could not upload: ${error.message}` : 'Could not upload the logo. Check your internet and try again.')
    }
    setBusy(false)
  }
  return <div className="stack logo-field">
    <span className="field-label">{label}<em className="muted small"> · {hint}</em></span>
    <div className={`logo-preview ${dark ? 'on-dark' : ''}`}>{value ? <img src={value} alt="" /> : <span className="muted small">No logo yet: the shop name is shown in type.</span>}</div>
    <div className="row">
      <label className="btn"><Icon name="plus" size={16} /> {busy ? 'Uploading…' : value ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/png,image/webp,image/jpeg" onChange={upload} disabled={busy} hidden /></label>
      {value ? <button type="button" className="btn ghost" onClick={() => { onChange(''); setNote('Logo removed. Press “Save changes” to show the shop name instead.') }}>Remove</button> : null}
    </div>
    {note ? <p className={note.startsWith('Could not') || note.startsWith('Use') || note.startsWith('This') || note.startsWith('Choose') ? 'bad-text' : 'good-text'} role="status">{note}</p> : null}
  </div>
}

function LogoCard({ brand, onChange }) {
  return <Card title="Logo">
    <div className="stack">
      <p className="muted small">PNG or WebP with a see-through background works best, at least 600 pixels wide, up to 2 MB.</p>
      <div className="grid-2">
        <LogoField label="Logo" hint="for the header, on a light background" value={brand.logoDark} onChange={(value) => onChange('logoDark', value)} />
        <LogoField label="Logo for dark backgrounds" hint="for the footer; usually a white or gold version" value={brand.logoLight} dark onChange={(value) => onChange('logoLight', value)} />
      </div>
      <TextField label="Logo text for screen readers" value={brand.logoAlt} onChange={(value) => onChange('logoAlt', value)} maxLength={60} />
    </div>
  </Card>
}

// Categories are the owner's own. Renaming one moves its products with it; removing one asks first and leaves
// its products needing a new category (they cannot be shown until they have one).
function CategoryRow({ category, index, count, used, taken, onRename, onText, onPatch, onMove, onRemove }) {
  const [name, setName] = useState(category.name)
  const [note, setNote] = useState('')
  useEffect(() => { setName(category.name) }, [category.name])
  const commit = () => {
    const next = name.trim()
    if (next === category.name) { setName(next); return }
    if (!next) { setNote('A category needs a name.'); setName(category.name); return }
    if (taken.includes(next.toLowerCase())) { setNote(`There is already a category called "${next}".`); setName(category.name); return }
    setNote('')
    onRename(next)
  }
  return <Card title={<span>{category.name} <Pill tone={used ? 'green' : 'grey'}>{used ? `${used} product${used === 1 ? '' : 's'}` : 'No products yet'}</Pill></span>} actions={<>
    <button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><Icon name="back" size={16} className="rot-90" /></button>
    <button type="button" className="icon-button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"><Icon name="back" size={16} className="rot-270" /></button>
    <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove ${category.name}`}><Icon name="trash" size={16} /></button>
  </>}>
    <div className="grid-2">
      <label className="field"><span>Name</span><input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
      <TextField label="Short description" hint="a few words, e.g. Glow and care" value={category.text} onChange={onText} maxLength={120} />
      <SitePhotoField label="Card photo" hint="square works best" kind="category" value={category.image} onChange={(image) => onPatch({ image })} />
      <IconSelect value={category.icon} onChange={(icon) => onPatch({ icon })} />
    </div>
    {note ? <p className="bad-text" role="status">{note}</p> : null}
  </Card>
}

function CategoriesTab({ categories, products, onChange }) {
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState('')
  const taken = (except) => categories.filter((_, i) => i !== except).map((category) => category.name.toLowerCase())
  const usedBy = (name) => products.filter((product) => product.category === name).length
  const setAt = (index, patch) => categories.map((category, i) => (i === index ? { ...category, ...patch } : category))
  const rename = (index, name) => {
    const old = categories[index].name
    onChange(setAt(index, { name }), products.map((product) => (product.category === old ? { ...product, category: name } : product)))
  }
  const move = (index, step) => {
    const next = [...categories]
    const [item] = next.splice(index, 1)
    next.splice(index + step, 0, item)
    onChange(next)
  }
  const remove = (index) => {
    const { name } = categories[index]
    const used = usedBy(name)
    if (!window.confirm(used
      ? `Remove "${name}"? ${used} product${used === 1 ? ' is' : 's are'} in it. You will need to choose a new category for ${used === 1 ? 'it' : 'them'} before ${used === 1 ? 'it' : 'they'} can be shown.`
      : `Remove the category "${name}"?`)) return
    onChange(categories.filter((_, i) => i !== index))
  }
  const add = (event) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) { setNote('Type a name for the new category.'); return }
    if (taken(-1).includes(name.toLowerCase())) { setNote(`There is already a category called "${name}".`); return }
    if (categories.length >= MAX_CATEGORIES) { setNote(`You can have up to ${MAX_CATEGORIES} categories.`); return }
    onChange([...categories, { name, text: '', image: '', icon: ICON_CHOICES[0] }])
    setNewName(''); setNote('')
  }
  return <div className="stack">
    <p className="muted">Your product categories, in the order the website shows them. A category appears on the website only once it has a product on show. Renaming a category moves its products with it.</p>
    <Card title="Add a category">
      <form className="row wrap" onSubmit={add}>
        <label className="field grow"><span>Name</span><input value={newName} maxLength={40} placeholder="e.g. Hair care" onChange={(event) => setNewName(event.target.value)} /></label>
        <button type="submit" className="btn"><Icon name="plus" size={16} /> Add category</button>
      </form>
      {note ? <p className="bad-text" role="status">{note}</p> : null}
    </Card>
    {categories.length ? null : <p className="muted">No categories yet. Add the first one above.</p>}
    {categories.map((category, index) => <CategoryRow key={`${index}-${category.name}`} category={category} index={index} count={categories.length}
      used={usedBy(category.name)} taken={taken(index)}
      onRename={(name) => rename(index, name)} onText={(text) => onChange(setAt(index, { text }))} onPatch={(patch) => onChange(setAt(index, patch))}
      onMove={(step) => move(index, step)} onRemove={() => remove(index)} />)}
  </div>
}

// ---- Tags and paths ------------------------------------------------------------------------------
// Needs and key ingredients are the owner's own tags. Renaming one moves every product with it; removing one
// asks first and takes it off the products that have it.
function TagList({ title, hint, items, describe, used, onRename, onDescribe, onMove, onRemove, onAdd }) {
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const taken = (except) => items.filter((_, i) => i !== except).map((item) => item.label.toLowerCase())
  const add = (event) => {
    event.preventDefault()
    const label = draft.trim()
    if (!label) { setNote('Type a name first.'); return }
    if (taken(-1).includes(label.toLowerCase())) { setNote(`"${label}" is already in the list.`); return }
    if (items.length >= MAX_TAGS) { setNote(`You can have up to ${MAX_TAGS}.`); return }
    onAdd(label); setDraft(''); setNote('')
  }
  return <Card title={title}>
    <div className="stack">
      <p className="muted small">{hint}</p>
      {items.map((item, index) => <TagRow key={`${index}-${item.label}`} item={item} index={index} count={items.length} describe={describe} used={used(item.label)} taken={taken(index)}
        onRename={(label) => onRename(index, label)} onDescribe={(text) => onDescribe?.(index, text)} onMove={(step) => onMove(index, step)} onRemove={() => onRemove(index)} />)}
      <form className="row wrap" onSubmit={add}>
        <label className="field grow"><span>Add one</span><input value={draft} maxLength={40} onChange={(event) => setDraft(event.target.value)} /></label>
        <button type="submit" className="btn"><Icon name="plus" size={16} /> Add</button>
      </form>
      {note ? <p className="bad-text" role="status">{note}</p> : null}
    </div>
  </Card>
}

function TagRow({ item, index, count, describe, used, taken, onRename, onDescribe, onMove, onRemove }) {
  const [label, setLabel] = useState(item.label)
  const [note, setNote] = useState('')
  useEffect(() => { setLabel(item.label) }, [item.label])
  const commit = () => {
    const next = label.trim()
    if (next === item.label) return
    if (!next) { setNote('It needs a name.'); setLabel(item.label); return }
    if (taken.includes(next.toLowerCase())) { setNote(`"${next}" is already in the list.`); setLabel(item.label); return }
    setNote(''); onRename(next)
  }
  return <div className="tag-row">
    <div className="grid-2">
      <label className="field"><span>Name <em className="muted small">· on {used} product{used === 1 ? '' : 's'}</em></span><input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
      {describe ? <TextField label="Short description" value={item.description || ''} onChange={onDescribe} maxLength={160} /> : null}
    </div>
    <div className="row">
      <button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><Icon name="back" size={16} className="rot-90" /></button>
      <button type="button" className="icon-button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"><Icon name="back" size={16} className="rot-270" /></button>
      <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove ${item.label}`}><Icon name="trash" size={16} /></button>
    </div>
    {note ? <p className="bad-text" role="status">{note}</p> : null}
  </div>
}

function TagsTab({ tags, lines, products, onChange }) {
  const moved = (list, index, step) => { const next = [...list]; const [item] = next.splice(index, 1); next.splice(index + step, 0, item); return next }
  const field = { needs: 'needs', ingredients: 'ingredients' }
  const used = (key) => (label) => products.filter((product) => product[field[key]]?.includes(label)).length
  const renameIn = (key, from, to) => products.map((product) => (product[field[key]]?.includes(from) ? { ...product, [field[key]]: product[field[key]].map((tag) => (tag === from ? to : tag)) } : product))
  const removeFrom = (key, label) => products.map((product) => (product[field[key]]?.includes(label) ? { ...product, [field[key]]: product[field[key]].filter((tag) => tag !== label) } : product))
  const confirmRemove = (label, count) => window.confirm(count ? `Remove "${label}"? It will be taken off ${count} product${count === 1 ? '' : 's'}.` : `Remove "${label}"?`)
  const needs = tags.needs
  const ingredients = tags.ingredients.map((label) => ({ label }))
  return <div className="stack">
    <Card title="Shop paths">
      <div className="stack">
        <p className="muted small">The two ways into the shop. You can rename them and change their words. Products in the second path always need their cautions before they can be shown.</p>
        {lines.map((line, index) => <div className="grid-2" key={line.id}>
          <TextField label={`Path ${index + 1} name`} value={line.label} maxLength={40} onChange={(value) => onChange({ lines: lines.map((item, i) => (i === index ? { ...item, label: value } : item)) })} />
          <TextField label="Short description" value={line.description} maxLength={200} onChange={(value) => onChange({ lines: lines.map((item, i) => (i === index ? { ...item, description: value } : item)) })} />
        </div>)}
      </div>
    </Card>
    <TagList title="Needs (Shop by need)" hint="What customers can shop by, e.g. Dark spots or Daily moisture. Use cosmetic words, never an illness. Tick them on each product in the Products tab." items={needs} describe used={used('needs')}
      onRename={(index, label) => onChange({ tags: { ...tags, needs: needs.map((need, i) => (i === index ? { ...need, label } : need)) } }, renameIn('needs', needs[index].label, label))}
      onDescribe={(index, description) => onChange({ tags: { ...tags, needs: needs.map((need, i) => (i === index ? { ...need, description } : need)) } })}
      onMove={(index, step) => onChange({ tags: { ...tags, needs: moved(needs, index, step) } })}
      onRemove={(index) => { const { label } = needs[index]; if (!confirmRemove(label, used('needs')(label))) return; onChange({ tags: { ...tags, needs: needs.filter((_, i) => i !== index) } }, removeFrom('needs', label)) }}
      onAdd={(label) => onChange({ tags: { ...tags, needs: [...needs, { label, description: '' }] } })} />
    <TagList title="Key ingredients (Shop by ingredient)" hint="Ingredients customers can filter by. Only tick an ingredient on a product if it is on the label." items={ingredients} used={used('ingredients')}
      onRename={(index, label) => onChange({ tags: { ...tags, ingredients: tags.ingredients.map((item, i) => (i === index ? label : item)) } }, renameIn('ingredients', tags.ingredients[index], label))}
      onMove={(index, step) => onChange({ tags: { ...tags, ingredients: moved(tags.ingredients, index, step) } })}
      onRemove={(index) => { const label = tags.ingredients[index]; if (!confirmRemove(label, used('ingredients')(label))) return; onChange({ tags: { ...tags, ingredients: tags.ingredients.filter((_, i) => i !== index) } }, removeFrom('ingredients', label)) }}
      onAdd={(label) => onChange({ tags: { ...tags, ingredients: [...tags.ingredients, label] } })} />
  </div>
}

// ---- Layout and menu ---------------------------------------------------------------------------------
const PAGE_FIELDS = [
  ['shopKicker', 'Shop page: small label', 30], ['shopTitle', 'Shop page: heading', 40], ['shopAccent', 'Shop page: heading, gold part', 40],
  ['reviewsKicker', 'Reviews page: small label', 30], ['reviewsTitle', 'Reviews page: heading', 40], ['reviewsAccent', 'Reviews page: heading, gold part', 40],
  ['contactKicker', 'Contact page: small label', 30], ['contactTitle', 'Contact page: heading', 40], ['contactAccent', 'Contact page: heading, gold part', 40],
  ['contactText', 'Contact page: text under the heading', 160], ['footerText', 'Footer: line under the logo (your delivery areas are added after it)', 100],
]

function LayoutTab({ layout, pages, onLayout, onPage }) {
  const moved = (list, index, step) => { const next = [...list]; const [item] = next.splice(index, 1); next.splice(index + step, 0, item); return next }
  const setIn = (key, index, patch) => onLayout({ ...layout, [key]: layout[key].map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  const sectionLabel = (key) => HOME_SECTIONS.find((section) => section.key === key)?.label || key
  const order = (key, index, count) => <>
    <button type="button" className="icon-button" onClick={() => onLayout({ ...layout, [key]: moved(layout[key], index, -1) })} disabled={index === 0} aria-label="Move up"><Icon name="back" size={16} className="rot-90" /></button>
    <button type="button" className="icon-button" onClick={() => onLayout({ ...layout, [key]: moved(layout[key], index, 1) })} disabled={index === count - 1} aria-label="Move down"><Icon name="back" size={16} className="rot-270" /></button>
  </>
  return <div className="stack">
    <Card title="Home page sections (below the hero)">
      <div className="stack">
        <p className="muted small">Put them in the order you want and untick any you do not want to show. The hero always stays at the top and the footer at the bottom.</p>
        {layout.sections.map((section, index) => <div className="row layout-row" key={section.key}>
          <label className="check grow"><input type="checkbox" checked={section.show} onChange={(event) => setIn('sections', index, { show: event.target.checked })} /> {sectionLabel(section.key)}</label>
          {order('sections', index, layout.sections.length)}
        </div>)}
      </div>
    </Card>
    <Card title="Main menu">
      <div className="stack">
        <p className="muted small">Rename, reorder or hide the menu links. "Shop" and "Categories" open their lists of paths and categories.</p>
        {layout.menu.map((item, index) => <div className="row layout-row" key={item.key}>
          <label className="check"><input type="checkbox" checked={item.show} onChange={(event) => setIn('menu', index, { show: event.target.checked })} aria-label={`Show ${item.label}`} /></label>
          <label className="field grow"><span className="visually-hidden">Menu name</span><input value={item.label} maxLength={30} onChange={(event) => setIn('menu', index, { label: event.target.value })} /></label>
          {order('menu', index, layout.menu.length)}
        </div>)}
      </div>
    </Card>
    <Card title="Other page headings">
      <div className="grid-2">{PAGE_FIELDS.map(([key, label, max]) => <TextField key={key} label={label} value={pages[key] || ''} onChange={(value) => onPage(key, value)} maxLength={max} />)}</div>
    </Card>
  </div>
}



function CheckoutTab({ checkout, onChange }) {
  const [feeText, setFeeText] = useState(toCedis(checkout.deliveryFee))
  const feeBad = feeText.trim() !== '' && parseGhs(feeText) === null
  const key = String(checkout.paystackPublicKey || '')
  return <div className="stack">
    <Card title="Delivery and pickup">
      <div className="stack">
        <label className={`field ${feeBad ? 'invalid' : ''}`}><span>Delivery fee (GHS)<em className="muted small"> · leave empty to agree the fee on the phone</em></span>
          <input inputMode="decimal" value={feeText} placeholder="e.g. 30.00" onChange={(event) => { setFeeText(event.target.value); onChange('deliveryFee', event.target.value.trim() === '' ? null : parseGhs(event.target.value)) }} />
          {feeBad ? <small className="bad-text">Type the fee like 30 or 30.50.</small> : null}
        </label>
        <label className="check"><input type="checkbox" checked={checkout.pickup} onChange={(event) => onChange('pickup', event.target.checked)} /> Customers can pick up at the shop</label>
      </div>
    </Card>
    <Card title="Online payment (Paystack)">
      <div className="stack">
        <p>{key ? <Pill tone={key.startsWith('pk_live_') ? 'green' : 'amber'}>{key.startsWith('pk_live_') ? 'Live payments on' : 'Test mode'}</Pill> : <Pill tone="grey">Off</Pill>} {key ? 'Customers pay online at checkout.' : 'Customers place orders and you call them to arrange payment.'}</p>
        <TextField label="Paystack public key" hint="starts with pk_live_ (or pk_test_ to try it)" value={key} onChange={(value) => onChange('paystackPublicKey', value.trim())} autoComplete="off" spellCheck={false} />
        <div className="callout warn"><Icon name="alert" /><p>Only paste the <b>public</b> key. Never paste the secret key (it starts with sk_). You find both in Paystack: Settings → API Keys and Webhooks.</p></div>
        <p className="muted small">After a customer pays, check the payment in your Paystack dashboard before you send the order. The order number is the Paystack reference.</p>
      </div>
    </Card>
  </div>
}

function TermsTab({ terms, onChange }) {
  const setSection = (index, key, value) => onChange({ ...terms, sections: terms.sections.map((section, i) => (i === index ? { ...section, [key]: value } : section)) })
  const move = (index, step) => {
    const sections = [...terms.sections]
    const [item] = sections.splice(index, 1)
    sections.splice(index + step, 0, item)
    onChange({ ...terms, sections })
  }
  return <div className="stack">
    <Card title="Terms and conditions">
      <div className="stack">
        <label className="field"><span>Last updated</span><input type="date" value={terms.updated} onChange={(event) => onChange({ ...terms, updated: event.target.value })} /></label>
        <p className="muted small">Write in simple words. Put each point on its own line. To insert a shop detail, type its code: {SHOP_FIELDS.map((field) => <code key={field.key} className="mono">{`{${field.key}}`}</code>).reduce((all, item) => [...all, ' ', item], [])}. It fills in from "Shop details".</p>
        <div className="callout warn"><Icon name="alert" /><p>This is a starting draft. Ask a lawyer in Ghana to check it before you rely on it.</p></div>
      </div>
    </Card>
    {terms.sections.map((section, index) => <Card key={index} title={`${index + 1}. ${section.title || 'Untitled section'}`} actions={<>
      <button type="button" className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"><Icon name="back" size={16} className="rot-90" /></button>
      <button type="button" className="icon-button" onClick={() => move(index, 1)} disabled={index === terms.sections.length - 1} aria-label="Move down"><Icon name="back" size={16} className="rot-270" /></button>
      <button type="button" className="icon-button" onClick={() => { if (window.confirm(`Delete the section "${section.title}"?`)) onChange({ ...terms, sections: terms.sections.filter((_, i) => i !== index) }) }} aria-label="Delete section"><Icon name="trash" size={16} /></button>
    </>}>
      <div className="stack">
        <TextField label="Title" value={section.title} onChange={(value) => setSection(index, 'title', value)} maxLength={80} />
        <TextField label="Text" multiline={6} value={section.body} onChange={(value) => setSection(index, 'body', value)} />
      </div>
    </Card>)}
    <div><button type="button" className="btn" onClick={() => onChange({ ...terms, sections: [...terms.sections, { title: 'New section', body: '' }] })}><Icon name="plus" size={16} /> Add a section</button></div>
  </div>
}
