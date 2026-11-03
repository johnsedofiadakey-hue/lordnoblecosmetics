import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { liveDb } from '../live/firebase.js'
import { useNow, useOps } from '../hooks.js'
import { sellableFromSummary } from '../../../functions/src/core/stock.js'
import { checkSiteEdits, cleanProduct, flattenGroups, formatGhs, groupProducts, MAX_PHOTOS, MAX_SIZES, MAX_VIDEOS, mergeCatalog, mergeContent, parseGhs } from '../../cloud/site.js'
import { checkPhoto, checkVideo, uploadProductPhoto, uploadProductVideo, VIDEO_TYPES } from '../live/storage.js'
import { Card, Empty, Icon, Pill, Segmented } from '../components/ui.jsx'
import { beep, CameraScanner } from '../components/scanner.jsx'

// Products: the one place to add and edit what the shop sells. Each product has its photos and videos, details,
// label text, tags and sizes; each size has its own price, cost, barcode and stock (stock itself is changed
// in Stock: deliveries, counts and adjustments). A product saves on its own, so editing one never touches another.
// The catalogue (site/catalog) is shared with the website, the till and the server: sizes are separate items
// that share a groupId (see groupProducts / flattenGroups in cloud/site.js).

const toCedis = (pesewas) => (Number.isInteger(pesewas) ? (pesewas / 100).toFixed(2) : '')
const newId = () => `new-product-${Date.now().toString(36)}`

// The website content the editor needs: categories, tags, shop paths (and checkout/terms for the save checks).
function useSiteContent() {
  const [content, setContent] = useState(null)
  useEffect(() => onSnapshot(doc(liveDb, 'site', 'content'), (snap) => setContent(mergeContent(snap.exists() ? snap.data() : null)), () => setContent(mergeContent(null))), [])
  return content
}

export default function Products({ sub }) {
  const content = useSiteContent()
  if (sub) return <ProductPage key={sub} id={sub} content={content} />
  return <ProductList />
}

// ---- The list ---------------------------------------------------------------------------------------

function ProductList() {
  const { products, catalogLoaded } = useOps()
  const now = useNow(60000)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [arranging, setArranging] = useState(false)
  const rows = useMemo(() => groupProducts(products).map((group) => {
    const items = group.sizes.map((size) => products.find((product) => product.id === size.id)).filter(Boolean)
    const stock = items.reduce((sum, item) => sum + sellableFromSummary(item.stock, now), 0)
    const low = items.some((item) => sellableFromSummary(item.stock, now) <= (item.setup.reorderPoint ?? 3))
    const issues = [
      !group.price ? 'No price' : '',
      !group.images?.length ? 'No photo' : '',
      items.some((item) => !item.setup.barcode && !item.setup.sku) ? 'No barcode' : '',
    ].filter(Boolean)
    return { group, items, stock, low, issues }
  }), [products, now])
  const needle = search.trim().toLowerCase()
  const shown = rows.filter(({ group, issues, low }) => {
    const matches = filter === 'all' || (filter === 'live' && group.visible) || (filter === 'hidden' && !group.visible) || (filter === 'attention' && (issues.length || low))
    return matches && (!needle || `${group.name} ${group.brand} ${group.category} ${group.sizes.map((size) => size.size).join(' ')}`.toLowerCase().includes(needle))
  })
  const count = (test) => rows.filter(test).length

  if (arranging) return <ArrangeProducts rows={rows} onDone={() => setArranging(false)} />

  return <div className="stack">
    <div className="toolbar products-toolbar">
      <a className="btn primary" href="#/products/new"><Icon name="plus" size={16} /> Add product</a>
      {rows.length > 1 ? <button type="button" className="btn" onClick={() => setArranging(true)}><Icon name="sort" size={16} /> Arrange order</button> : null}
      <label className="search grow"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, brand, category or size" aria-label="Search products" /></label>
    </div>
    <Segmented label="Products to show" value={filter} onChange={setFilter} options={[
      { value: 'all', label: 'All', count: rows.length },
      { value: 'live', label: 'On website', count: count((row) => row.group.visible) },
      { value: 'hidden', label: 'Shop only / hidden', count: count((row) => !row.group.visible) },
      { value: 'attention', label: 'Needs attention', count: count((row) => row.issues.length || row.low) },
    ]} />
    {!catalogLoaded ? <p className="muted">Loading the products…</p> : shown.length ? <ul className="card-list product-list">{shown.map(({ group, stock, low, issues }) => <li key={group.id}>
      <a className="sale-row product-row" href={`#/products/${encodeURIComponent(group.id)}`}>
        <span className="sale-row-main sale-row-product">
          {group.images?.[0] ? <img className="admin-product-thumb large" src={group.images[0]} alt="" /> : <span className="admin-product-thumb large placeholder" aria-hidden="true" />}
          <span>
            <b>{group.name}</b>
            <span className="muted small">{[group.category || 'No category', group.sizes.length > 1 ? `${group.sizes.length} sizes` : group.sizes[0]?.size, group.price ? (group.maxPrice && group.maxPrice !== group.price ? `${formatGhs(group.price)} – ${formatGhs(group.maxPrice)}` : formatGhs(group.price)) : 'No price'].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
        <span className="sale-row-side">
          <span className={`small ${low ? 'bad-text' : ''}`}><b>{stock}</b> in stock</span>
          {group.visible ? <Pill tone="green">On website</Pill> : <Pill tone="grey">Hidden</Pill>}
          {issues.map((issue) => <Pill key={issue} tone="amber">{issue}</Pill>)}
          {low && stock > 0 ? <Pill tone="amber">Low stock</Pill> : null}
        </span>
      </a>
    </li>)}</ul> : <Empty title={rows.length ? 'Nothing matches' : 'No products yet'}>{rows.length ? null : 'Press “Add product” to add the first one.'}</Empty>}
  </div>
}

// ---- Arranging: the order customers see ------------------------------------------------------------------
// The shop page, category pages and the home page's "Most loved" list products in this order. Saving rewrites
// only the order of the latest saved catalogue; no product, size or id changes.
function ArrangeProducts({ rows, onDone }) {
  const { toast, user } = useOps()
  const [order, setOrder] = useState(() => rows.map((row) => row.group.id))
  const [saving, setSaving] = useState(false)
  const byId = new Map(rows.map((row) => [row.group.id, row]))
  const changed = order.join('|') !== rows.map((row) => row.group.id).join('|')
  const move = (index, to) => setOrder((current) => {
    const next = [...current]
    const [id] = next.splice(index, 1)
    next.splice(Math.max(0, Math.min(next.length, to)), 0, id)
    return next
  })
  const save = async () => {
    setSaving(true)
    try {
      await runTransaction(liveDb, async (tx) => {
        const ref = doc(liveDb, 'site', 'catalog')
        const snap = await tx.get(ref)
        const current = mergeCatalog(snap.exists() ? snap.data() : null)
        const groups = groupProducts(current)
        const position = new Map(order.map((id, index) => [id, index]))
        // Products added elsewhere since this list opened keep their place at the end.
        const sorted = [...groups].sort((a, b) => (position.get(a.id) ?? order.length) - (position.get(b.id) ?? order.length))
        const flat = flattenGroups(sorted, new Set(current.map((product) => product.id)))
        tx.set(ref, { products: flat.map(cleanProduct), updatedAt: serverTimestamp(), updatedBy: user.uid })
      })
      toast('New order saved. The website shows it now.')
      onDone()
    } catch {
      toast('Could not save the order. Check your internet and try again.', 'error')
    }
    setSaving(false)
  }
  return <div className="stack arrange">
    <div className="product-page-head">
      <button type="button" className="btn ghost" onClick={() => { if (!changed || window.confirm('Leave without saving the new order?')) onDone() }}><Icon name="back" size={16} /> All products</button>
      <h2>Arrange products</h2>
    </div>
    <p className="muted">This is the order customers see on the shop page and in each category. Put the products you want to push at the top. The home page’s “Most loved” shows your best sellers in this order too.</p>
    <ol className="arrange-list">{order.map((id, index) => {
      const row = byId.get(id)
      if (!row) return null
      return <li key={id}>
        <span className="arrange-pos">{index + 1}</span>
        {row.group.images?.[0] ? <img className="admin-product-thumb" src={row.group.images[0]} alt="" /> : <span className="admin-product-thumb placeholder" aria-hidden="true" />}
        <span className="arrange-name"><b>{row.group.name}</b><span className="muted small">{[row.group.category, row.group.visible ? 'On website' : 'Hidden', row.group.bestSeller ? 'Best seller' : ''].filter(Boolean).join(' · ')}</span></span>
        <span className="arrange-moves">
          <button type="button" className="btn ghost small" onClick={() => move(index, 0)} disabled={index === 0} aria-label={`Move ${row.group.name} to the top`}>Top</button>
          <button type="button" className="icon-button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${row.group.name} up`}><Icon name="back" size={16} className="rot-90" /></button>
          <button type="button" className="icon-button" onClick={() => move(index, index + 1)} disabled={index === order.length - 1} aria-label={`Move ${row.group.name} down`}><Icon name="back" size={16} className="rot-270" /></button>
        </span>
      </li>
    })}</ol>
    <div className={`save-bar ${changed ? '' : 'is-quiet'}`} role="region" aria-label="Save order">
      <span>{changed ? <><Icon name="alert" size={16} /> The new order is not saved yet</> : 'Move products up or down, then save.'}</span>
      <button type="button" className="btn primary" onClick={save} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save order'}</button>
    </div>
  </div>
}

// ---- One product -----------------------------------------------------------------------------------

// What the page edits: the shared details, plus each size with its till details.
function draftFrom(group, items) {
  return {
    ...group,
    sizes: group.sizes.map((size) => {
      const item = items.find((candidate) => candidate.id === size.id)
      return {
        id: size.id, size: size.size, price: size.price, inStock: size.inStock,
        barcode: item?.setup.barcode || '', sku: item?.setup.sku || '', reorderPoint: String(item?.setup.reorderPoint ?? 3),
        tracksExpiry: item?.setup.tracksExpiry !== false, cost: item?.cost ?? null, original: item ? tillOf(item) : null,
      }
    }),
  }
}
const tillOf = (item) => JSON.stringify({ barcode: item.setup.barcode || '', sku: item.setup.sku || '', reorderPoint: String(item.setup.reorderPoint ?? 3), tracksExpiry: item.setup.tracksExpiry !== false, cost: item.cost ?? null })
const blankProduct = (id) => ({ ...groupProducts([cleanProduct({ id, name: '', visible: false })])[0], name: '', sizes: [{ id, size: '', price: null, inStock: true, barcode: '', sku: '', reorderPoint: '3', tracksExpiry: true, cost: null, original: null }] })

function ProductPage({ id, content }) {
  const { products, catalogLoaded, call, toast, user } = useOps()
  const now = useNow(60000)
  const isNew = id === 'new'
  const existing = useMemo(() => (isNew ? null : groupProducts(products).find((group) => group.id === id || group.sizes.some((size) => size.id === id))), [products, id, isNew])
  const items = existing ? existing.sizes.map((size) => products.find((product) => product.id === size.id)).filter(Boolean) : []
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Start from the saved product once it has loaded (or a blank one), and not again while editing.
  useEffect(() => {
    if (draft) return
    if (isNew) setDraft(blankProduct(newId()))
    else if (existing) setDraft(draftFrom(existing, items))
  }, [existing, isNew, draft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!catalogLoaded || !content) return <p className="muted">Loading…</p>
  if (!isNew && !existing && !draft) return <Empty title="Product not found">This product is no longer in the list. <a href="#/products">Back to products</a></Empty>
  if (!draft) return <p className="muted">Loading…</p>

  const set = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setDirty(true) }
  const stockOf = (sizeId) => {
    const item = products.find((product) => product.id === sizeId)
    return item ? sellableFromSummary(item.stock, now) : null
  }

  const save = async () => {
    const problems = checkDraft(draft)
    if (problems.length) { toast(problems[0], 'error'); return }
    setSaving(true)
    let saved = null
    try {
      await runTransaction(liveDb, async (tx) => {
        const ref = doc(liveDb, 'site', 'catalog')
        const snap = await tx.get(ref)
        const current = mergeCatalog(snap.exists() ? snap.data() : null)
        const savedIds = new Set(current.map((product) => product.id))
        const groups = groupProducts(current)
        const plain = { ...draft, sizes: draft.sizes.map(({ id: sizeId, size, price, inStock }) => ({ id: sizeId, size: size.trim(), price, inStock })) }
        const at = groups.findIndex((group) => group.id === draft.id)
        const next = at >= 0 ? groups.map((group, i) => (i === at ? plain : group)) : [plain, ...groups]
        const flat = flattenGroups(next, savedIds)
        // This product's items, in order, with their final ids.
        const before = next.slice(0, at >= 0 ? at : 0).reduce((sum, group) => sum + group.sizes.length, 0)
        const mine = flat.slice(before, before + plain.sizes.length)
        const ids = new Set(flat.map((product) => product.id))
        if (ids.size !== flat.length) throw new Error('Two products ended up with the same ID. Change the product name and try again.')
        const issues = checkSiteEdits(content, mine)
        if (issues.length) throw new Error(issues[0])
        tx.set(ref, { products: flat.map(cleanProduct), updatedAt: serverTimestamp(), updatedBy: user.uid })
        saved = { groupId: mine[0]?.groupId || draft.id, ids: mine.map((product) => product.id) }
      })
    } catch (error) {
      setSaving(false)
      toast(error instanceof Error && error.message && !/permission|insufficient/i.test(error.message) ? error.message : 'Could not save. Check your internet and that you are signed in as the owner, then try again.', 'error')
      return
    }
    // Till details for each size (barcode, shop code, cost, low-stock level, expiry): only those that changed.
    let tillProblem = ''
    for (const [index, size] of draft.sizes.entries()) {
      const till = { barcode: size.barcode.trim(), sku: size.sku.trim(), reorderPoint: String(size.reorderPoint || '3'), tracksExpiry: size.tracksExpiry, cost: size.cost }
      if (size.original === JSON.stringify(till)) continue
      const done = await call('saveProductSetup', { productId: saved.ids[index], sku: till.sku, barcode: till.barcode, reorderPoint: Number(till.reorderPoint), tracksExpiry: till.tracksExpiry, cost: till.cost })
      if (!done) tillProblem = `The details were saved, but the barcode or cost of "${size.size || draft.name}" were not. Check them and save again.`
    }
    setSaving(false)
    setDirty(false)
    if (tillProblem) toast(tillProblem, 'error')
    else toast(`${draft.name} saved. ${draft.visible ? 'The website shows the change now.' : 'It is hidden from the website.'}`)
    setDraft(null)
    window.location.hash = `#/products/${encodeURIComponent(saved.groupId)}`
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${draft.name || 'this product'}"? It disappears from the website and the till. Its past sales and stock history stay in the records.`)) return
    setSaving(true)
    try {
      await runTransaction(liveDb, async (tx) => {
        const ref = doc(liveDb, 'site', 'catalog')
        const snap = await tx.get(ref)
        const current = mergeCatalog(snap.exists() ? snap.data() : null)
        tx.set(ref, { products: current.filter((product) => (product.groupId || product.id) !== draft.id).map(cleanProduct), updatedAt: serverTimestamp(), updatedBy: user.uid })
      })
      setDirty(false)
      toast(`${draft.name || 'The product'} deleted.`)
      window.location.hash = '#/products'
    } catch {
      toast('Could not delete. Check your internet and try again.', 'error')
    }
    setSaving(false)
  }

  const concerns = draft.line === 'Skin concerns'
  const categoryMissing = !content.categories.some((category) => category.name === draft.category)
  return <div className="stack product-page">
    <div className="product-page-head">
      <a className="btn ghost" href="#/products" onClick={(event) => { if (dirty && !window.confirm('Leave without saving your changes?')) event.preventDefault() }}><Icon name="back" size={16} /> All products</a>
      <h2>{isNew ? 'New product' : draft.name || 'Untitled product'}</h2>
      {!isNew ? <a className="btn ghost" href={`/shop?product=${encodeURIComponent(draft.id)}`} target="_blank" rel="noreferrer">See it on the website</a> : null}
    </div>

    <Card title="Photos and videos">
      <MediaField product={draft} onChange={set} />
    </Card>

    <Card title="Details">
      <div className="stack">
        <div className="grid-2">
          <TextField label="Product name" value={draft.name} onChange={(value) => set('name', value)} maxLength={80} placeholder="e.g. Royal Cream with Bee Venom Complex" />
          <TextField label="Brand" value={draft.brand} onChange={(value) => set('brand', value)} maxLength={40} />
          <label className={`field ${categoryMissing ? 'invalid' : ''}`}><span>Category{content.categories.length ? null : <em className="muted small"> · add categories in Website editor → Categories</em>}</span>
            <select value={draft.category} onChange={(event) => set('category', event.target.value)}>
              {categoryMissing ? <option value={draft.category}>{draft.category ? `${draft.category} (removed)` : 'Choose a category'}</option> : null}
              {content.categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Shop path</span><select value={draft.line} onChange={(event) => set('line', event.target.value)}>{content.lines.map((line) => <option key={line.id} value={line.id}>{line.label}</option>)}</select></label>
        </div>
        <TextField label="Good for" hint="short, e.g. Moisturizing facial cream" value={draft.type} onChange={(value) => set('type', value)} maxLength={60} />
        <TextField label="Short description" hint="one or two simple sentences" multiline={3} value={draft.description} onChange={(value) => set('description', value)} maxLength={400} />
      </div>
    </Card>

    <Card title="Sizes, prices and stock">
      <SizesTable product={draft} stockOf={stockOf} onChange={(sizes) => set('sizes', sizes)} />
    </Card>

    <Card title="From the label">
      <div className="stack">
        <TextField label="How to use" hint="as on the label; one step per line" multiline={4} value={draft.howToUse} onChange={(value) => set('howToUse', value)} maxLength={1200} />
        <TextField label="Ingredients" hint="copy exactly from the pack" multiline={4} value={draft.ingredientList} onChange={(value) => set('ingredientList', value)} maxLength={2000} />
        <TextField label={concerns ? 'Cautions (required for this shop path)' : 'Cautions'} hint="warnings exactly as on the label" multiline={3} value={draft.cautions} onChange={(value) => set('cautions', value)} maxLength={1200} />
        {concerns ? <div className="callout warn"><Icon name="alert" /><p>Use only wording approved for this product (label and Ghana FDA approval). Do not describe diseases or promise results.</p></div> : null}
      </div>
    </Card>

    <Card title="Tags (for the shop filters)">
      <div className="stack">
        <TagPicker label="Shop by need" options={content.tags.needs.map((need) => need.label)} value={draft.needs} onChange={(value) => set('needs', value)} />
        <TagPicker label="Key ingredients" options={content.tags.ingredients} value={draft.ingredients} onChange={(value) => set('ingredients', value)} />
        <p className="muted small">Add or rename tags in Website editor → Tags and paths.</p>
      </div>
    </Card>

    <Card title="Website">
      <div className="stack">
        <label className="check"><input type="checkbox" checked={draft.visible} onChange={(event) => set('visible', event.target.checked)} /> Show on the website <em className="muted small">· untick for items sold only in the shop</em></label>
        <label className="check"><input type="checkbox" checked={draft.bestSeller} onChange={(event) => set('bestSeller', event.target.checked)} /> Best seller <em className="muted small">· shown under “Most loved” with a badge</em></label>
      </div>
    </Card>

    {!isNew ? <div><button type="button" className="btn danger-ghost" onClick={remove} disabled={saving}><Icon name="trash" size={16} /> Delete product</button></div> : null}

    <div className={`save-bar ${dirty ? '' : 'is-quiet'}`} role="region" aria-label="Save">
      <span>{dirty ? <><Icon name="alert" size={16} /> Unsaved changes</> : isNew ? 'Fill in the product, then save.' : 'All changes saved.'}</span>
      <button type="button" className="btn primary" onClick={save} disabled={saving || (!dirty && !isNew)}>{saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button>
    </div>
  </div>
}

// Problems before saving, in plain words.
function checkDraft(draft) {
  const problems = []
  if (!String(draft.name).trim()) problems.push('Type the product name.')
  if (draft.sizes.length > 1 && draft.sizes.some((size) => !String(size.size).trim())) problems.push('Give every size a name, e.g. 50 g.')
  const names = draft.sizes.map((size) => String(size.size).trim().toLowerCase()).filter(Boolean)
  if (new Set(names).size !== names.length) problems.push('The same size is listed twice.')
  if (draft.sizes.some((size) => size.priceBad)) problems.push('Type each price like 250 or 250.50.')
  if (draft.sizes.some((size) => size.costBad)) problems.push('Type each cost like 120 or 120.50.')
  if (draft.sizes.some((size) => !/^\d{1,4}$/.test(String(size.reorderPoint)))) problems.push('The low-stock warning must be a whole number.')
  return problems
}

// ---- Sizes ------------------------------------------------------------------------------------------

function SizesTable({ product, stockOf, onChange }) {
  const sizes = product.sizes
  const [scanFor, setScanFor] = useState(null)
  const setAt = (index, patch) => onChange(sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)))
  const add = () => onChange([...sizes, { id: `new-size-${Date.now().toString(36)}`, size: '', price: null, inStock: true, barcode: '', sku: '', reorderPoint: '3', tracksExpiry: true, cost: null, original: null }])
  const remove = (index) => {
    if (!window.confirm(`Remove the size "${sizes[index].size || 'without a name'}"? Its stock history stays in the records, but nobody can sell it any more.`)) return
    onChange(sizes.filter((_, i) => i !== index))
  }
  return <div className="stack">
    <p className="muted small">One line per size. Each size has its own price, barcode and stock. A product with one size just needs one line (the size name is optional).</p>
    {sizes.map((size, index) => <SizeRow key={size.id} size={size} stock={stockOf(size.id)} canRemove={sizes.length > 1}
      onChange={(patch) => setAt(index, patch)} onRemove={() => remove(index)} onScan={() => setScanFor(index)} />)}
    {sizes.length < MAX_SIZES ? <div><button type="button" className="btn ghost" onClick={add}><Icon name="plus" size={16} /> Add a size</button></div> : null}
    <p className="muted small">Stock goes up with <a href="#/stock/receive">Stock → Receive delivery</a> and is corrected in <a href="#/stock">Stock</a>. Customers can buy a size once it has a price and stock.</p>
    {scanFor !== null ? <CameraScanner title="Scan the barcode" onClose={() => setScanFor(null)} onScan={(code) => { beep(); setAt(scanFor, { barcode: code }); setScanFor(null) }} /> : null}
  </div>
}

function SizeRow({ size, stock, canRemove, onChange, onRemove, onScan }) {
  const [priceText, setPriceText] = useState(toCedis(size.price))
  const [costText, setCostText] = useState(toCedis(size.cost))
  const priceBad = priceText.trim() !== '' && parseGhs(priceText) === null
  const costBad = costText.trim() !== '' && parseGhs(costText) === null
  const price = parseGhs(priceText)
  const cost = parseGhs(costText)
  return <fieldset className="size-card">
    <div className="size-card-head">
      <label className="field"><span>Size</span><input value={size.size} placeholder="e.g. 50 g or 100 ml" maxLength={30} onChange={(event) => onChange({ size: event.target.value })} /></label>
      <label className={`field ${priceBad ? 'invalid' : ''}`}><span>Selling price (GHS)</span>
        <input inputMode="decimal" value={priceText} placeholder="e.g. 250.00" onChange={(event) => { setPriceText(event.target.value); const value = parseGhs(event.target.value); onChange({ price: value && value > 0 ? value : null, priceBad: event.target.value.trim() !== '' && value === null }) }} />
      </label>
      <span className="size-stock-box">{stock === null ? <em className="muted small">Stock after saving</em> : <><b>{stock}</b><span className="muted small">in stock</span></>}</span>
      {canRemove ? <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove size ${size.size}`}><Icon name="trash" size={16} /></button> : <span />}
    </div>
    <details className="size-card-more">
      <summary>Till details: barcode, cost, low-stock warning</summary>
      <div className="grid-2">
        <label className="field"><span>Barcode</span>
          <span className="row"><input className="grow mono" inputMode="numeric" value={size.barcode} placeholder="Scan or type" onChange={(event) => onChange({ barcode: event.target.value.trim() })} />
            <button type="button" className="btn secondary" onClick={onScan} aria-label="Scan with camera"><Icon name="camera" size={16} /></button></span>
        </label>
        <label className="field"><span>Shop code (SKU) <em className="muted small">optional</em></span><input className="mono" value={size.sku} onChange={(event) => onChange({ sku: event.target.value.toUpperCase() })} placeholder="e.g. RC-50" /></label>
        <label className={`field ${costBad ? 'invalid' : ''}`}><span>Cost of one (GHS) <em className="muted small">what it costs you</em></span>
          <input inputMode="decimal" value={costText} onChange={(event) => { setCostText(event.target.value); const value = parseGhs(event.target.value); onChange({ cost: event.target.value.trim() === '' ? null : value, costBad: event.target.value.trim() !== '' && value === null }) }} />
        </label>
        <label className="field"><span>Warn when stock is at</span><input inputMode="numeric" value={size.reorderPoint} onChange={(event) => onChange({ reorderPoint: event.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
      </div>
      {price && cost !== null && !costBad ? <p className="small muted">Profit per item: <b>{formatGhs(price - cost)}</b> ({Math.round(((price - cost) / price) * 100)}%)</p> : null}
      <label className="check"><input type="checkbox" checked={size.tracksExpiry} onChange={(event) => onChange({ tracksExpiry: event.target.checked })} /> Has an expiry date (asked for on deliveries)</label>
    </details>
  </fieldset>
}

// ---- Photos and videos -------------------------------------------------------------------------------

function MediaField({ product, onChange }) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const photos = product.images || []
  const videos = product.videos || []
  const upload = async (event) => {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const isVideo = (file) => Boolean(VIDEO_TYPES[file.type])
    const photoFiles = files.filter((file) => !isVideo(file)).slice(0, Math.max(0, MAX_PHOTOS - photos.length))
    const videoFiles = files.filter(isVideo).slice(0, Math.max(0, MAX_VIDEOS - videos.length))
    const skipped = files.length - photoFiles.length - videoFiles.length
    const problem = [...photoFiles.map(checkPhoto), ...videoFiles.map(checkVideo)].find(Boolean)
    if (problem) { setNote(problem); return }
    if (!photoFiles.length && !videoFiles.length) { setNote(`This product already has ${MAX_PHOTOS} photos and ${MAX_VIDEOS} videos. Remove one first.`); return }
    setNote('')
    try {
      const newPhotos = []
      const newVideos = []
      for (const [i, file] of photoFiles.entries()) { setBusy(`Uploading photo ${i + 1} of ${photoFiles.length}…`); newPhotos.push(await uploadProductPhoto(product.id, file)) }
      for (const [i, file] of videoFiles.entries()) { setBusy(`Uploading video ${i + 1} of ${videoFiles.length} (this can take a minute)…`); newVideos.push(await uploadProductVideo(product.id, file)) }
      if (newPhotos.length) onChange('images', [...photos, ...newPhotos])
      if (newVideos.length) onChange('videos', [...videos, ...newVideos])
      const parts = [newPhotos.length ? `${newPhotos.length} photo${newPhotos.length === 1 ? '' : 's'}` : '', newVideos.length ? `${newVideos.length} video${newVideos.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')
      setNote(`${parts} uploaded${skipped ? ` (${skipped} did not fit: up to ${MAX_PHOTOS} photos and ${MAX_VIDEOS} videos)` : ''}. Press “Save changes” to keep ${newPhotos.length + newVideos.length === 1 ? 'it' : 'them'}.`)
    } catch (error) {
      const denied = /unauthorized|permission|403/i.test(String(error?.code || error?.message))
      setNote(denied ? 'Could not upload: this account is not allowed to add product photos. Sign in as the owner.' : error instanceof Error && error.message ? `Could not upload: ${error.message}` : 'Could not upload. Check your internet and try again.')
    }
    setBusy('')
  }
  const move = (key, list, index, step) => { const next = [...list]; const [item] = next.splice(index, 1); next.splice(index + step, 0, item); onChange(key, next) }
  const strip = (key, list, kind) => <div className="photo-strip">{list.map((src, index) => <figure key={src + index} className={kind === 'video' ? 'video' : index === 0 ? 'main' : ''}>
    {kind === 'video' ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" />}
    <figcaption>
      <button type="button" className="icon-button" onClick={() => move(key, list, index, -1)} disabled={index === 0} aria-label="Move left"><Icon name="back" size={14} /></button>
      <button type="button" className="icon-button" onClick={() => { onChange(key, list.filter((_, i) => i !== index)); setNote(`${kind === 'video' ? 'Video' : 'Photo'} removed. Press “Save changes” to keep this.`) }} aria-label={`Remove ${kind} ${index + 1}`}><Icon name="trash" size={14} /></button>
      <button type="button" className="icon-button" onClick={() => move(key, list, index, 1)} disabled={index === list.length - 1} aria-label="Move right"><Icon name="back" size={14} className="rot-180" /></button>
    </figcaption>
  </figure>)}</div>
  return <div className="stack product-photo">
    {photos.length ? strip('images', photos, 'photo') : <span className="product-photo-empty">No photo yet</span>}
    {videos.length ? strip('videos', videos, 'video') : null}
    <div className="row wrap">
      <label className="btn"><Icon name="plus" size={16} /> {busy || 'Add photos or videos'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={upload} disabled={Boolean(busy)} hidden /></label>
      <span className="muted small">{photos.length} of {MAX_PHOTOS} photos, {videos.length} of {MAX_VIDEOS} videos. The first photo is the main one. Photos: JPG, PNG or WebP up to 5 MB. Videos: MP4 works best, up to 50 MB.</span>
    </div>
    {note ? <p className={/uploaded|removed/.test(note) ? 'good-text' : 'bad-text'} role="status">{note}</p> : null}
  </div>
}

// ---- Small fields ------------------------------------------------------------------------------------

function TextField({ label, hint, value, onChange, multiline = false, ...rest }) {
  return <label className="field">
    <span>{label}{hint ? <em className="muted small"> · {hint}</em> : null}</span>
    {multiline ? <textarea rows={multiline === true ? 3 : multiline} value={value || ''} onChange={(event) => onChange(event.target.value)} {...rest} /> : <input value={value || ''} onChange={(event) => onChange(event.target.value)} {...rest} />}
  </label>
}

function TagPicker({ label, options, value, onChange }) {
  const toggle = (option) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
  return <fieldset className="field tag-picker">
    <legend>{label}</legend>
    <div className="row wrap">{options.map((option) => <label key={option} className={`check chip ${value.includes(option) ? 'on' : ''}`}><input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} /> {option}</label>)}</div>
  </fieldset>
}
