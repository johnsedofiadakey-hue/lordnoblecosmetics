# Lordnoble Cosmetics — Project Plan & Claude Build Handoff

**Status:** Planning approved; implementation handoff ready  
**Design owner:** Codex (creative direction, interface composition, motion review)  
**Build owner:** Claude (application foundation, commerce journeys, integrations, quality checks)  
**Deployment:** Explicitly out of scope until a separate release approval

---

## 1. The brief

Build a premium Ghanaian beauty-commerce website for **Lordnoble Cosmetics**. The site must feel like a modern beauty campaign and a reliable shop at the same time: rich, sensual, polished, fast, and simple to buy from.

The client reference establishes the brand palette and product categories, but **must not be reproduced as a static template**. Its weaknesses are a conventional split hero, repetitive product cards, and little visual story. The new experience should use editorial composition, cinematic movement, and product-led scenes to create a much stronger identity.

### Brand idea

**Lordnoble — Confidence, in Motion.**

Beauty is presented as a personal ritual: discover a need, understand the care, choose a product, and feel confident buying it.

### Audience

- Ghana-based beauty and wellness shoppers, primarily mobile-first.
- Customers purchasing skincare, body care, feminine care, wellness products, and beauty tools.
- Shoppers who need clear product benefits, trustworthy delivery/payment information, and an uncomplicated checkout.

### Measures of success

1. The first screen feels unmistakably premium and cinematic, not like a generic ecommerce theme.
2. A shopper can find a product, understand it, add it to bag, and reach checkout quickly on a phone.
3. Product price, stock, cart, checkout, delivery information, and reviews are clear and credible.
4. Motion improves the story without causing slow, inaccessible, or confusing shopping journeys.
5. The design system can grow as products and campaigns are added.

---

## 2. Non-negotiable design direction

### Palette

Use the supplied brand direction as the starting point:

- **Deep wine / burgundy:** dramatic framing, primary actions, navigation states, night scenes.
- **Soft blush:** warmth, care, product backdrops, gentle section transitions.
- **Warm ivory:** primary reading background and breathing room.
- **Antique gold:** restrained highlight for details, lines, accents, and premium cues.
- **Near-black plum:** body text, high-contrast type, and depth.

Gold must remain an accent, never a large, hard-to-read text color or a dominant background. Preserve strong contrast for text and controls.

### Typography and image language

- Use a high-contrast editorial serif for large statements and a crisp, modern sans-serif for UI, product information, and long-form reading.
- Treat real products as art-direction elements, not small catalogue thumbnails alone.
- Use luminous skin, product macro shots, silk/satin, water or oil, botanicals, glass, shadows, and warm gold light as the material world.
- Favour real Lordnoble product photography, licensed content, or art-directed commissioned imagery. Do not use generic-looking AI beauty portraits or invent misleading product claims.
- Product labels, packaging, ingredients, prices, and results must remain accurate to real supplied data.

### Reference lesson to borrow — not copy

Borrow the best of the SkinMatrix approach: bold editorial product composition, substantial negative space, and discovery built around customer needs rather than a wall of categories.

Do **not** borrow its clinical, cool, lavender/white identity. Lordnoble is warmer, more glamorous, more tactile, and emotionally led.

---

## 3. Responsibility split

| Area | Claude owns | Codex owns |
|---|---|---|
| Application | Project setup, routing, data boundaries, responsive implementation, testing | Review of implementation against design intent |
| Commerce | Catalogue, search/filtering, bag, checkout integration seams, order confirmation, policies | Product-page hierarchy and conversion UX review |
| Admin/data | Safe content/product schema, stock/pricing readiness, integration documentation | Requirements review only |
| Visual system | Implement approved tokens/components faithfully | Art direction, page composition, typography, imagery, visual QA |
| Motion | Implement approved GSAP patterns safely and accessibly | Define sequencing, pacing, transitions, and accept/reject quality |
| Release | Prepare release checklist only | Final design sign-off; no deployment without user approval |

Claude should not replace the visual direction with a generic theme, a dark SaaS look, flat purple gradients, or an unreviewed alternate brand identity. If a visual decision is not specified here, Claude should choose the most restrained, neutral implementation and flag it for design review.

---

## 4. Scope and information architecture

### Launch pages

1. **Home** — campaign-led discovery and selected products.
2. **Shop** — searchable/filterable full catalogue.
3. **Collection pages** — Feminine Care, Body Care, Skin Rituals, Wellness, and Beauty Tools.
4. **Product detail** — the key conversion page.
5. **Our Story** — brand promise, product quality, authenticity, and Ghana delivery.
6. **Reviews / Results** — approved customer stories and product-linked reviews.
7. **Beauty Journal** — educational articles and routines; can be a structured placeholder until editorial content arrives.
8. **Cart and Checkout** — clear, minimal, confidence-building purchase flow.
9. **Delivery, returns, FAQ, privacy, terms, contact** — trust and support content.

### Required journey

`Homepage campaign → ritual/category → collection → product detail → bag → checkout → confirmation`

At every step, preserve a clear path back to shopping and a clear bag count. Do not make a user watch an animation before they can shop.

---

## 5. Homepage sequence (build to this order)

### 5.1 Global utility and navigation

- A small utility strip for Ghana nationwide delivery, product authenticity, currency (GHS), and social/support links.
- Clean primary navigation: Shop, Categories/Rituals, Our Story, Reviews, Journal, Search, Account if applicable, Bag.
- Sticky navigation that becomes compact after the hero; no large header blocking mobile content.
- Mobile menu must be thumb-friendly, fully keyboard accessible, and provide a direct Shop and Bag route.

### 5.2 Hero: “Confidence, in Motion”

This is a full-bleed, high-impact campaign scene. It should not resemble the supplied reference’s left-copy/right-model banner.

- Primary statement: a concise confidence-focused message. Final copy will be supplied/approved by the design owner.
- Two simple CTAs: **Shop the ritual** and **Find your care**.
- Visual composition: product(s), a beauty/editorial figure where approved, and tactile material elements staged in depth.
- Initial movement: slow light/texture motion, staged type reveal, controlled product drift, and subtle parallax.
- Must have a still-image fallback with the same message and CTA clarity.

### 5.3 Choose your ritual

Turn the five categories into distinct, image-led pathways rather than standard equal cards:

- Feminine Care — soft, intimate, reassuring.
- Body Care — warm, tactile, sensorial.
- Skin Rituals — luminous, clean, transformative.
- Wellness — botanical, grounded, restorative.
- Beauty Tools — precise, polished, performance-led.

Each path needs a title, a short benefit statement, an image, and an obvious link. The component must remain useful with one tap on mobile; hover is only an enhancement.

### 5.4 Featured ritual / product story

A major editorial module for one hero collection or product. Include:

- What it helps with (only approved, compliant claims)
- Key product/ingredient highlights
- Simple use ritual
- Product CTA and price
- Link to supporting detail

### 5.5 Shop signature products

Display a curated set of best sellers/new arrivals. Product cards require:

- Real product image with fixed, stable aspect ratio
- Product name, concise purpose, price in GHS, rating only when real
- Stock/availability state from the authoritative product source
- Quick add to bag and a direct product-detail link
- A clear disabled/unavailable state; never fake availability

### 5.6 The Lordnoble standard

An animated but readable proof band covering authentic products, delivery, secure payment, quality ingredients, and customer care. This may use small line icons and a marquee only if it pauses appropriately and respects reduced motion.

### 5.7 Results, education, closing scene

- Approved customer reviews with product connection and verified context where possible.
- Beauty Journal previews for education and repeat visits.
- Final campaign scene with a direct Shop CTA and support/delivery reassurance.

---

## 6. Product, shop, and checkout requirements

### Shop and collection pages

- Search by product name and useful keywords.
- Filters appropriate to the actual catalogue: category, concern/benefit, price, availability, and optionally skin/body type.
- Sort by featured, newest, price, and best selling only when the data supports these labels.
- Filters must be usable on a small screen; use a clear modal/sheet pattern on mobile.
- Never hide an applied filter or produce a dead-end empty state. Offer reset and adjacent categories.

### Product detail page

Prioritize confidence over decoration. Include:

1. Image gallery with accessible zoom and stable image loading.
2. Product name, price in GHS, availability, concise benefit, and quantity/add-to-bag control above the fold.
3. Delivery and secure-payment reassurance near the purchase control.
4. “Why you’ll love it”, key ingredients/materials, use instructions, suitable-for guidance, size/volume, and full product information.
5. Ingredients/claims and safety notes exactly as supplied; do not generate medical, bleaching, treatment, or efficacy claims.
6. Approved reviews and related products/routines.

### Bag and checkout

- Persistent bag state across route changes and refresh when technically appropriate.
- Edit quantity and remove controls; stock must be revalidated before payment/order placement.
- Breakdown of subtotal, delivery, discount if real, and final total in GHS before commitment.
- Delivery areas, timing, policy, support contact, and payment methods must be explicit.
- Integrate the client’s actual payment and fulfilment provider only when the credentials, policy, and server-side security boundary are approved.
- No test keys, hard-coded secrets, fake order confirmations, or client-side-only payment verification.

---

## 7. Motion implementation requirements

Use GSAP only where it adds material value. It must be lazy-loaded or scoped so that it does not delay initial purchasing interaction.

### Approved motion vocabulary

- Editorial line and headline reveals
- Image reveals using masks/clip paths
- Small, slow depth/parallax movement in campaign scenes
- Staggered product entrances and collection transitions
- Tactile but brief add-to-bag confirmation
- Page/section transition moments that feel like wine, blush, silk, or light—not generic tech effects

### Motion constraints

- Respect `prefers-reduced-motion`; replace movement with instant or short opacity transitions.
- Do not animate layout-critical dimensions in a way that causes cumulative layout shift.
- No scroll-jacking, forced horizontal scrolling, autoplay audio, inaccessible canvas-only information, or long preloads.
- Pause off-screen expensive animation and avoid running continuous animation on low-priority mobile sections.
- Every CTA, product card, filter, and checkout control must work with motion disabled.

---

## 8. Technical and data requirements for Claude

### First implementation decision

Before creating production integrations, Claude should document the selected stack and why it supports:

- Responsive, fast storefront performance
- Search-friendly public pages
- Safe server-side payment and order operations
- Content/product updates without code edits where reasonable
- Image optimization and reliable deployment/rollback

If creating a new application, use a mature, maintainable frontend approach with semantic HTML, responsive CSS, and a component system. Do not introduce a heavyweight animation or UI library merely to recreate basic controls.

### Data boundaries

Keep catalogue, price, stock, reviews, orders, and customer information authoritative and separate from presentation data.

- Stock is the source of customer availability.
- Product visibility, Ghana price, and positive sellable stock are all required before a product can be purchased online.
- Price/stock/order changes must be server-controlled or securely mediated; do not trust browser values at checkout.
- Preserve an audit trail for orders, payment state, fulfilment state, refunds, and stock changes.
- Keep physical delivery status separate from payment status.
- Never commit credentials. Store live secrets server-side and document required environment variables by name only.

### Suggested content model

Claude should implement or document the equivalent of:

`Product`: id, slug, name, category, purpose, shortDescription, fullDescription, priceGhs, compareAtPriceGhs optional, images, ingredients, howToUse, size, visibility, featured, availability, stockSummary, safetyNotes, SEO metadata.

`Category/Ritual`: id, slug, title, description, hero image/video reference, visual treatment, sort order.

`Review`: id, productId optional, customer display name, location optional, rating, approved text, approval status, consent evidence/reference.

`Order`: id, immutable line snapshots, customer/contact and delivery details, payment status, fulfilment status, totals, timestamps, audit history.

### Quality baseline

- Semantic landmarks, labels, keyboard navigation, focus visibility, and meaningful image alternatives.
- Colour contrast appropriate for wine/gold/blush combinations.
- Responsive layouts tested at small phone, large phone, tablet, laptop, and wide desktop widths.
- Optimized images with reserved dimensions; no layout shift during product-card loading.
- Error, loading, unavailable, and empty states designed—not omitted.
- No mock data or placeholder claims in any production-bound flow. Label demo content clearly during development.

---

## 9. Required project artefacts from Claude

Claude should deliver the following before requesting launch approval:

1. `README.md` — local setup, selected stack, commands, environment variable names, and architectural overview.
2. `CONTENT_AND_ASSETS.md` — exact list of copy, product data, photography, video, policy, and integration inputs still required from Lordnoble.
3. `INTEGRATION_PLAN.md` — payment, delivery, catalogue/admin, stock, email/SMS, and analytics approach; identify what is implemented versus pending.
4. `TEST_PLAN.md` — unit/integration/browser journey coverage and manual-device checks.
5. `RELEASE_CHECKLIST.md` — branch, environment, backup/rollback, live payment/stock checks, domain, policies, monitoring, and post-release validation.
6. The responsive storefront and required commerce flows, with real integrations only where authorised.

---

## 10. Acceptance gates

### Gate A — foundation ready

- Project runs locally with documented setup.
- Routes, content model, responsive shell, bag state, product-list/detail pages, and error states are present.
- Claude provides the asset/integration gap list.

### Gate B — commerce ready

- Product price/availability is connected to an authoritative source.
- Bag, checkout handoff, order creation, payment boundary, delivery information, and review moderation rules are implemented or explicitly marked pending.
- Tests cover the critical browse-to-order journey and stock/price safeguards.

### Gate C — visual and motion sign-off (Codex)

- Desktop and mobile visual review confirms the composition is cinematic, legible, and consistent with this brief.
- Motion is polished, reduced-motion-safe, and does not block commerce.
- Real imagery/products are used where supplied; all remaining placeholders are reported.

### Gate D — release approval (user only)

- Branch, target environment, release scope, live credentials, payment, delivery, stock, policies, privacy, backups, and rollback path are verified.
- Do not deploy before this approval.

---

## 11. Inputs still needed from the client

Claude must create the foundation without guessing these facts, and report anything missing:

- Final logo files and brand-use rules
- Product catalogue, product photos, sizes, accurate price in GHS, stock, and category assignments
- Approved copy, ingredients, usage, warnings, claims, and compliance guidance
- Delivery areas, fees, timing, returns/exchange policy, phone/WhatsApp, email, and business address
- Payment provider decision and secured credentials through an approved channel
- Approved customer reviews and permissions
- Campaign photography/video and any image-licensing confirmation
- Domain, analytics, email/SMS, and admin/operations requirements

---

## 12. Working protocol

1. Claude builds in small, reviewable increments and reports files changed, tests run, and what is still mocked/pending.
2. Codex reviews design decisions at Gate A and Gate C, with special attention to hero quality, image composition, typography, motion, and mobile polish.
3. Existing business systems, real data, and credentials must be preserved. Do not overwrite or migrate data without an approved migration plan and rollback path.
4. Treat local implementation, tests, visual review, integration verification, and deployment as separate states in every status update.

This document is the build authority. Any requirement that changes payment, production data, legal copy, delivery policy, or deployment needs explicit approval before it is acted on.
