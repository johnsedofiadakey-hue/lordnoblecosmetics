# Lordnoble Cosmetics — visual audit and public storefront plan

**Review date:** 2 October 2026  
**Decision already made:** Build the final public site in `/Users/truth/Developer/Lordnoble Cosmetics`; use the [private concept preview](https://lordnoble-beauty-preview.johnsedofiadakey.chatgpt.site/) as visual direction. Launch must support online purchase with cart and payment. **Skin Glow Serum** is the lead product when approved photography arrives.

## Executive assessment

**The preview is memorable, but it does not yet communicate a shoppable beauty store clearly enough.** Its white pinned product stage, turn/open sequence, burgundy cover transition, and gold details create a distinctive first impression. A new visitor can infer “premium beauty,” but the hero says “Beauty in motion” rather than plainly saying what Lordnoble sells. There is no visible shopping action, price, product detail, bag, checkout, or practical delivery information in that preview. The existing Next.js project already has much of the commerce page structure; the right next step is to bring the visual idea into that project and connect it to real catalogue data.

The supplied screenshot establishes the categories and aesthetic ambition. It is a reference, not verified product photography, pricing, claims, customer reviews, or evidence of a live shop.

## Visual and customer journey audit

| Area | What works | What weakens the buying journey | Priority |
|---|---|---|---|
| First screen | Oversized product, strong white space, burgundy/gold focal point, clear visual identity | “Beauty in motion” is brand language without a concrete product/store promise. “Explore” leads to an anchor rather than a product. The concept bottle is correctly labelled as concept art. | High |
| Scroll choreography | The white hero stays in place while the burgundy story rises over it. The bottle turn/open feels more ownable than a stock beauty banner. | The long pin and full-height story delay the actual range on mobile. Motion needs to complete without holding a shopper away from products. | High |
| Story panel | Rich color and confident typography; creates a pause after the reveal. | “Confidence is personal” and the paragraph are emotionally sound but could belong to many brands. Add a specific Lordnoble promise that can be substantiated. | Medium |
| Five categories | Frames are already reserved for real photography; names map to the client's reference. | Cards are not clickable, and the largest card leads with Feminine Care while the chosen launch hero is Skin Glow Serum. No price, stock, size, or route to a product. | High |
| Featured serum scene | The product scale and wine backdrop are compelling. | Copy says “More than one ritual” rather than selling the actual serum. On mobile the image renders about **230 px wide × 1536 px tall** inside a roughly **633 px** media frame; it is badly cropped and overlaps the scene's intent. Set responsive image height and containment when implementation starts. | Critical visual fix |
| Final call to action | Elegant closing frame. | Another “Explore the collection” anchor, with no direct Shop Serum or checkout path. The preview has no useful store footer. | High |
| Mobile navigation | The 390 px layout has no horizontal overflow and the wordmark remains visible. | Only “Explore” is available in the preview header. There is no accessible route to shop, search, bag, contact, or policies. | High |
| Trust and proof | Restrained tone avoids obviously invented testimonials. | The preview cannot yet answer how to pay, what delivery costs/times are, whether an item is available, what is in it, or who to contact. Any claims/reviews need client approval and consent. | Launch gate |

**Will customers know exactly what it does?** They will know it is a beauty brand with five kinds of care after scrolling. They will not know, from the first screen, that they can buy products online or why Skin Glow Serum is the featured item. A customer who arrives with purchase intent has no purchase route on the preview. The existing storefront has routes for shop, collection, product detail, bag, checkout, support, and reviews; we should preserve and improve those rather than reproduce the preview as a static page.

## Typography and color verdict

The preview uses **Italiana + Manrope**. Italiana makes the hero feel unusual and elegant, but its very thin strokes and large spacing make long headings less robust, especially on phones. Manrope works for product information and controls. The existing Next.js site uses **Cormorant Garamond + Inter**, so the two surfaces currently look like different brands.

**Recommended direction:** Use **Cormorant Garamond** with a more deliberate weight and italic contrast for campaign headlines, paired with **Manrope** for navigation, prices, product facts, forms, and admin. This keeps the expressive editorial quality already present in the real project while giving product text a sturdier, more contemporary voice. Keep Italiana only as an optional wordmark exploration, after testing it at small sizes. Before coding the full type change, compare two real home compositions at desktop and 390 px mobile: (A) Cormorant Garamond + Manrope, (B) a stronger high-contrast display serif such as Bodoni Moda + Manrope. Choose one system for the entire public site. Use no more than one expressive display face and one practical text face in production.

The palette is strong: **wine `#2B0711`, burgundy `#5D0B20`, warm white `#FFFDF9`, soft blush `#F8E7E3`, and gold**. Warm white is the right neutral; blush works as a second neutral for category and editorial sections. Gold should mainly mark lines, accents, and large text. Measured contrast for the preview's `#B58A45` gold is about **3.09:1 on warm white** and **2.62:1 on blush**, too low for ordinary small text against the [WCAG AA 4.5:1 text target](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Use a darker gold or burgundy for small light-background labels.

## Homepage we should build

1. **Useful header:** Lordnoble wordmark, Shop, five categories, search, bag count, and contact access. A compact mobile menu keeps the bag visible.
2. **Product-led hero:** White pinned stage with the actual Skin Glow Serum front image. A headline states the product/store offer in plain language, supported by the campaign line. Primary action: **Shop Skin Glow Serum**. Secondary action: **Explore all care**. Keep the product visible and copy readable through the turn/open animation.
3. **The burgundy reveal:** Preserve the cover-up transition. Shorten the pin on mobile and make the end state deterministic on back navigation, fast scrolling, reduced motion, and image loading delays.
4. **Five care paths:** Skin Care leads; all cards link to live collection pages. Use real photos as they arrive. Show designed placeholders only while content is pending, and never present concept packaging as an actual SKU.
5. **Serum conversion block:** Real name, size, approved purpose/benefits, accurate GHS price, live availability, product-page link, and add-to-bag action. Provide ingredient/how-to-use links. Product fields come from Firestore, not hardcoded campaign copy.
6. **Products worth browsing:** A small live product shelf with real prices, availability, and direct product links. Only use “best seller” if supported by actual sales data.
7. **Trust and help:** Client-confirmed delivery coverage/timing, payment methods once integrated, authenticity statement if substantiated, approved customer reviews with consent, WhatsApp/contact, returns and policy links.
8. **Final purchase invitation:** A strong Shop Serum or Shop All button, then a practical footer. Motion can still carry through section titles, gold line work, subtle depth, and staggered product entrances.

## Media and animation contract

- The relocated preview has named media slots in `/Users/truth/Developer/Lordnoble Cosmetics/concept-preview/dist/media-config.js`. The production site should instead reference the existing product image schema and Firebase Storage, with an optional separate campaign-media record for matched hero frames. Keep URLs, alt text, dimensions, and approval state explicit.
- A convincing turn/open needs **matched front, back, and open views of the same real package**. If the client sends one front shot, use a restrained scale/tilt and reveal the product story. Do not fake a 360° product view from a single photo.
- Keep hero animation on its own client component so product listing, prices, links, and checkout remain server-rendered/usable without GSAP. Give the hero reserved dimensions, load the lead image promptly, and avoid long scroll locks on mobile.
- Support `prefers-reduced-motion` with the final static hero state and usable actions. Decorative motion must not block keyboard focus or reading order.
- Fix the current featured image distortion first; review desktop and mobile screenshots after every real-photo swap.

## What exists in the real Firebase/Next.js project

`/Users/truth/Developer/Lordnoble Cosmetics` is a **local Gate A foundation, not a deployed commerce site**. It has home, shop, collections, PDP, bag, checkout, order confirmation, reviews, journal, story, and support routes. It already re-quotes browser bag IDs and quantities on the server, checks sellability, and separates payment from fulfillment status. The home currently chooses the first purchasable featured product; it does **not** explicitly select Skin Glow Serum. Its `STANDARD` copy currently promises tracked nationwide delivery and secure server-verified payment before those launch integrations are complete; this copy needs evidence or a pending state before public release.

There is **no admin route**, no approved live product catalogue, no real product photographs, and no payment provider/webhook. Checkout is deliberately gated off until Firestore and checkout configuration are ready. The repo currently has an all-untracked working tree and no configured Git remote; preserve that state and establish a deliberate shared baseline before two people edit it.

## Ownership and sequence

| Workstream | Owner | Deliverable |
|---|---|---|
| Public experience | Codex + John | Typography choice, responsive cinematic home, live product/collection/PDP purchase flow, accessible motion, truthful store copy |
| Admin portal and catalogue operations | Claude | Protected `/admin`, product/media/category/review/order/stock workflows, server validation, audit trail; see [Claude handoff](./CLAUDE_ADMIN_HANDOFF.md) |
| Shared contract | Joint review before either branch changes it | Firestore/Zod field changes, image contracts, claims, rules, payment/order invariants |
| Payment integration | Explicitly assigned in implementation planning | Provider initialization, server verification/webhook, idempotent paid transition, stock movement, refund rules; must be complete before online purchase is enabled |

**Phase 0 — agree the baseline:** Preserve the untracked repo, identify the real Firebase project, and agree branch/worktree ownership. Freeze the current schemas as the first integration contract. No demo data or direction artwork should be mistaken for approved launch material.

**Phase 1 — design and contract:** Approve the type comparison, first-screen message, reduced-motion behavior, Skin Glow Serum selection strategy, media record, and Claude's admin acceptance criteria. Decide the payment provider and who implements it.

**Phase 2 — parallel build:** Codex builds the public pages; Claude builds `/admin` and server-owned operations against the agreed contract. Shared schema/rules changes are reviewed before merge.

**Phase 3 — integration:** Load approved products/photos, test admin publish → public display → add to bag → server quote → checkout → provider test payment → verified order → stock decrement → fulfillment. Test failure, retry, duplicate webhook, out-of-stock and changed-price cases.

**Phase 4 — launch review:** Visual QA on desktop and common mobile widths, keyboard/reduced-motion QA, image/performance review, Firebase rules tests, payment provider test mode, real policy/contact/delivery content, and an explicit production release decision. Local build success, emulator tests, payment test mode, and production deployment are separate evidence.

## Client inputs still needed before launch

| Input | Why it matters |
|---|---|
| Approved Skin Glow Serum packshots; ideally front, back, and open/dropper views; then photos for the other four products | Real product-led hero and honest product pages |
| Product names, sizes, ingredients, warnings, approved benefits/claims, GHS prices, stock | Truthful detail pages and buyability |
| Payment provider and merchant account | Actual online purchase and verified payment |
| Delivery regions, fees, time promises, courier/tracking method, returns rules | Checkout total and credible service copy |
| Customer support channels, policy text, final logo, approved reviews with consent | Trust and launch completeness |
| Firebase project ownership and initial staff accounts | Secure admin and deployment |

**Acceptance for this plan:** The homepage tells a first-time visitor what Lordnoble sells and where to buy within the first screen; Skin Glow Serum is the visible lead; all five category paths work; actual product data and imagery replace placeholders without layout repair; the bag/payment path is real and server-verified; admin content changes appear publicly only when intentionally published; no unverified promise or claim is presented as fact.
