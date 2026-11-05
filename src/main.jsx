import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ShopPage, { WishlistPage } from './ShopPage'
import CheckoutPage from './CheckoutPage'
import TermsPage from './TermsPage'
import { AboutPage, ContactPage, ReviewsPage } from './InfoPages'
import TrackPage from './TrackPage'
import CartDrawer from './Checkout'
import ProductSheet from './ProductSheet'
import { SiteProvider } from './storefront'
import './site.css'
import './lordina-hero.css'
import './lordina-range.css'
import './shop-panel.css'
import './panels.css'
import './lordnoble-extras.css'
import './shop.css'
import './footer.css'

// One bundle, several pages (Firebase rewrites every path here). Anything unknown shows the home page.
// Product details and the cart slide over every page; paying happens on /checkout.
const PAGES = { '/shop': ShopPage, '/wishlist': WishlistPage, '/checkout': CheckoutPage, '/terms': TermsPage, '/about': AboutPage, '/reviews': ReviewsPage, '/contact': ContactPage }
// /t/<code> is a customer's order tracking page.
const path = window.location.pathname.replace(/\/+$/, '')
const Page = path.startsWith('/t/') ? TrackPage : PAGES[path] || App

createRoot(document.getElementById('root')).render(
  <StrictMode><SiteProvider><Page /><ProductSheet /><CartDrawer /></SiteProvider></StrictMode>,
)
