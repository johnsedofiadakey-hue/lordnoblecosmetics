import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ShopPage from './ShopPage'
import TermsPage from './TermsPage'
import { AboutPage, ContactPage, ReviewsPage } from './InfoPages'
import TrackPage from './TrackPage'
import CheckoutDrawer from './Checkout'
import ProductSheet from './ProductSheet'
import { SiteProvider } from './storefront'
import './site.css'
import './lordina-hero.css'
import './lordina-range.css'
import './shop-panel.css'
import './panels.css'
import './lordnoble-extras.css'

// One bundle, several pages (Firebase rewrites every path here). Anything unknown shows the home page.
// /checkout is the shop with the checkout panel already open. Product details and checkout slide over every page.
const PAGES = { '/shop': ShopPage, '/checkout': ShopPage, '/terms': TermsPage, '/about': AboutPage, '/reviews': ReviewsPage, '/contact': ContactPage }
// /t/<code> is a customer's order tracking page.
const path = window.location.pathname.replace(/\/+$/, '')
const Page = path.startsWith('/t/') ? TrackPage : PAGES[path] || App

createRoot(document.getElementById('root')).render(
  <StrictMode><SiteProvider><Page /><ProductSheet /><CheckoutDrawer /></SiteProvider></StrictMode>,
)
