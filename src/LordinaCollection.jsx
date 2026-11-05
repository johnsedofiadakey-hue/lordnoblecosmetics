import { useSite, groupPriceLabel, orderLink } from './storefront'

// The catalogue product a range item stands for: the one the owner linked in Admin, otherwise the same name.
export function findRangeProduct(item, products) {
  if (!Array.isArray(products) || !item) return null
  if (item.productId) {
    const linked = products.find((group) => group.id === item.productId || group.sizes?.some((size) => size.id === item.productId))
    if (linked) return linked
  }
  const name = item.name.trim().toLowerCase()
  return products.find((group) => group.name?.trim().toLowerCase() === name) || null
}

function RangeItem({ item, products, shop }) {
  const { openProduct } = useSite()
  const product = findRangeProduct(item, products)
  const message = `Hello Lordnoble, how much is ${item.name}${item.size ? ` (${item.size})` : ''}, and can I buy it now?`
  const href = orderLink(shop, message)
  return <article className="lordina-range__item">
    <div className="lordina-range__image"><img src={item.image} alt={`${item.name} with its box`} loading="lazy" decoding="async" /></div>
    <div className="lordina-range__words">
      {item.use ? <span className="lordina-range__use">{item.use}</span> : null}
      <h3>{item.name}</h3>
      {item.size ? <span className="lordina-range__size">{item.size}</span> : null}
      {item.text ? <p>{item.text}</p> : null}
    </div>
    <div className="lordina-range__buy">
      {product ? <>
        <b>{groupPriceLabel(product)}</b>
        <button type="button" onClick={() => openProduct(product.id)}>View details</button>
      </> : href === '/contact'
        ? <span className="lordina-range__pending">Price coming soon</span>
        : <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>Ask about this product</a>}
    </div>
  </article>
}

// The five Lordina products, face then body. `compact` is the shop page's version: no intro, one grid.
export default function LordinaCollection({ products, compact = false }) {
  const { content } = useSite()
  const { home, shop } = content
  const items = (home.range || []).filter((item) => item.show !== false)
  if (!items.length) return null
  return <section className={`lordina-range ${compact ? 'lordina-range--compact' : ''}`} id="lordina-range" aria-labelledby="lordina-range-title">
    <div className="lordina-range__intro">
      <h2 id="lordina-range-title">{compact ? 'Shop Lordina' : home.rangeTitle || 'The Lordina range'}</h2>
      <p>{items.length} products</p>
      {home.rangeText ? <p className="lordina-range__description">{home.rangeText}</p> : null}
    </div>

    <div className="lordina-range__grid">{items.map((item) => <RangeItem key={item.key} item={item} products={products} shop={shop} />)}</div>

    {home.rangeNote ? <p className="lordina-range__note">{home.rangeNote}</p> : null}
  </section>
}
