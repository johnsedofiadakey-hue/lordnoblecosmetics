# Admin portal — shared contract proposal

**Author:** Claude (admin owner) · **Date:** 2 October 2026 · **Status:** Approved by John, 2 October 2026. Open questions (§7) proceed on the stated defaults until answered
**Branch:** `admin/foundation` (from baseline `49ba8c6` on `main`)
**Responds to:** [`CLAUDE_ADMIN_HANDOFF.md` → First coordination checkpoint](./CLAUDE_ADMIN_HANDOFF.md#first-coordination-checkpoint)

This document fixes the five contracts that the public site and admin both depend on. It also lists every shared-file
edit I plan to make. No admin code will land on a shared file until this is approved. Admin-only files (`src/app/admin/**`
and similar) can start once the auth decision (§3) is settled.

**Principles across all five contracts**

- **The server is the only writer.** Every admin mutation is a Server Action that runs `requireAdmin()` first.
  It validates input with Zod and writes through the Admin SDK. Browser Firestore/Storage writes are closed entirely (§6).
- **Values derived from current state change only in transactions.** This covers stock, order status and lead-product
  selection. Each transaction checks an expected value, so two staff members can't silently overwrite each other.
- **Every business-critical change leaves an append-only record.** That means `stockMovements` for stock, `order.audit`
  for orders, and `auditEvents` for catalogue, media, settings and access.
- **The public site reads resolved, validated data.** It never needs to understand admin-only collections.

---

## 1. Lead (hero) product selection

**Problem:** `src/app/page.tsx` currently uses the first purchasable `featured` product. The lead must be **Skin Glow
Serum**, chosen deliberately.

**Proposal:** a single settings document, `settings/storefront`, published by admin and read by the home page.

```ts
// src/lib/domain/schemas.ts (shared — addition)
export const StorefrontSettingsSchema = z.object({
  /** Product that leads the hero and the conversion block. null = no lead chosen yet. */
  leadProductId: z.string().min(1).nullable(),
  /** Hero imagery for the lead product, resolved at publish time (see §2). */
  hero: z.object({
    front: ImageRefSchema,
    back: ImageRefSchema.nullable(),
    open: ImageRefSchema.nullable(),
  }).nullable(),
  /** Optional curated shelf order. Empty = existing behaviour (featured products). */
  shelfProductIds: z.array(z.string().min(1)).max(12).default([]),
  updatedAt: z.string().datetime(),
  updatedBy: z.string(),
});
```

```ts
// src/lib/data/storefront.ts (new, shared read helper written by Claude, consumed by Codex)
export async function getStorefrontLead(): Promise<{
  product: Product | null;          // null when unset, hidden or not purchasable
  hero: StorefrontSettings["hero"]; // null → product-free campaign hero
  turnAvailable: boolean;           // true only when front + back + open are all present
}>;
```

**Rules**

- The lead is set only by the admin action `setLeadProduct({ productId, expectedUpdatedAt })`. The product must
  exist and be **publishable** (§2 checklist). It may be hidden at selection time, so the hero can be staged before launch.
- **Public fallback (for Codex):** if the lead product is missing, hidden or not purchasable, the home page shows the
  campaign hero **without a product or price**. It never substitutes another product and never shows a stale price.
  The conversion block shows its "coming soon" state.
- The `turnAvailable` flag enforces the media-handoff rule: the GSAP turn/open runs only with three matched views. With
  only `front`, the hero uses the restrained scale/tilt. We never fake a 360° turn.
- `featured: boolean` on products is unchanged and still drives the shelf when `shelfProductIds` is empty.
- In demo mode, `getStorefrontLead()` returns the demo serum record so Codex can build against it now.

## 2. Media and campaign imagery

**Problem:** imagery needs alt text, dimensions, approval state, and a hard separation between concept art and approved
product photography. The public site should keep consuming the existing `ImageRef` shape.

**Proposal:** a `media/{mediaId}` library owned by admin. Products and settings **embed resolved `ImageRef`s** at
publish time, so public reads stay one document deep and the public code doesn't change.

```ts
// src/lib/domain/schemas.ts (shared — additions)
export const MediaAssetSchema = z.object({
  id: z.string().min(1),
  storagePath: z.string().min(1),          // catalog/products/{productId}/{id}.webp | campaign/{id}.webp
  src: z.string().url(),
  alt: z.string().min(1).max(250),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentType: z.enum(["image/webp", "image/avif", "image/png", "image/jpeg"]),
  bytes: z.number().int().positive(),
  kind: z.enum(["product_photo", "campaign", "concept"]),
  /** Only "approved" assets can be attached to products or the hero. */
  approval: z.enum(["approved", "pending", "concept"]),
  licenceRef: z.string().optional(),      // where the licence / model release is recorded
  uploadedAt: z.string().datetime(),
  uploadedBy: z.string(),
});

// ImageRefSchema gains one optional, non-breaking field:
//   mediaId: z.string().optional()   — traces an embedded image back to its library record
```

**Upload path (server-only):** the browser posts the file to an admin Route Handler, `POST /admin/api/media`. That
handler:

1. Runs `requireAdmin()`.
2. Enforces the size limit: 8 MB for products, 25 MB for campaign images. Video is deferred.
3. Checks the type from the **file's magic bytes**, not from the declared content type.
4. Reads the real pixel dimensions and requires at least 1600 px on the long edge for product photos.
5. Writes the file to Storage and the `media` document with the Admin SDK.

**Rules**

- A `concept` asset can never be attached to a product or to the hero. The server rejects this, and the admin UI marks
  concept assets clearly.
- Replacing an image creates a new asset and re-points the product. The old file stays until no record references it,
  so a published page never shows a broken image.
- Reordering, alt-text edits and attach/detach on a product go through the product save action (§2a below) and are
  audited.

**2a. Product publish checklist** (enforced server-side; shown in the UI as a checklist):

- Price above 0 pesewas, and the compare-at price (if set) is above the price.
- At least one image, all from approved media.
- `purpose` and `shortDescription` present.
- `demo` is false.
- The slug is unique. **Once a product has been public, its slug can't be changed** (a redirect plan is a later
  feature).

Draft = `visibility: "hidden"`. Admin preview renders the product page from the draft behind `requireAdmin()`, under
`/admin/products/{id}/preview`.

## 3. Admin authentication and session

Follows the Next.js 16 auth guide in `node_modules/next/dist/docs/01-app/02-guides/authentication.md`: a server-side
Data Access Layer is the real check. `proxy.ts` is optional and only used for optimistic redirects, never for
authorization.

**Flow**

1. `/admin/sign-in` (its own layout, no public header) signs in with the Firebase Auth **client SDK**. This is the
   only use of the client SDK.
2. The browser sends the fresh ID token to the Server Action `createAdminSession`. That action:
   - verifies the token with `checkRevoked`
   - requires `auth_time` within the last 5 minutes and the custom claim `admin === true`
   - mints a Firebase **session cookie**, valid for 8 hours.
3. The cookie is `__session` with `HttpOnly; Secure; SameSite=Strict; Path=/`. Firebase hosting forwards only that
   cookie name.
4. `src/lib/admin/session.ts` exports `requireAdmin()`, memoised per request with React `cache`. It runs
   `verifySessionCookie(cookie, true)` (revocation-checked) and checks `admin === true`. It returns
   `{ uid, email }`, otherwise it redirects to sign-in (pages) or throws `Unauthorized` (actions and route handlers).
   It is called by **every** admin page, Server Action and Route Handler. A layout-level check alone is not trusted.
5. **Sign-out** revokes the user's refresh tokens and deletes the cookie.
6. Admin responses send `noindex` and `Cache-Control: private, no-store`.

**Provisioning (no self-elevation)**

- `scripts/admin-access.ts grant|revoke|list --email <address>` is run by the Firebase project owner from a terminal.
  It uses their own Google credentials (Application Default Credentials), and it needs the user to have signed in
  once so the account exists.
- It prints the target project and asks the owner to type the project ID back before changing anything. It refuses to
  run against a project that doesn't match `FIREBASE_PROJECT_ID`.
- Revoking access also revokes refresh tokens, so existing sessions end within one request.
- Every grant or revoke writes an `auditEvents` record. The UI has no control that changes claims.

**Demo mode:** `/admin` requires `LORDNOBLE_DATA_SOURCE=firestore`. Locally, that means the emulators, which need JDK 21.
In demo mode it shows an explanatory notice instead of fake data.

## 4. Stock adjustment

**Proposal:** stock changes only through `adjustStock`. Product save actions **strip `stock`** from their input.

```ts
// src/lib/domain/schemas.ts (shared — addition)
export const StockMovementSchema = z.object({
  id: z.string().min(1),                 // = client-generated requestId → idempotent
  productId: z.string().min(1),
  type: z.enum(["initial_count", "received", "count_correction", "damaged_or_expired",
                "returned_to_stock", "sale", "sale_reversal", "other"]),
  delta: z.number().int(),               // signed
  previousStock: z.number().int().nonnegative(),
  newStock: z.number().int().nonnegative(),
  note: z.string().max(500).optional(),  // required when type = "other" or "count_correction"
  orderId: z.string().optional(),        // set for sale / sale_reversal / returned_to_stock
  actor: z.string(),                     // "admin:<uid>" | "payment-webhook"
  at: z.string().datetime(),
});
```

**`adjustStock({ requestId, productId, type, delta | setTo, expectedStock, note })`** runs in a single Firestore
transaction:

1. It reads the product. If `stock !== expectedStock`, it aborts with a **conflict** ("Stock is now 7 — someone else
   changed it. Review and retry.").
2. It computes `newStock`, rejecting negative results.
3. It writes `product.stock`, `product.updatedAt` and `stockMovements/{requestId}` with `tx.create`. A double-submitted
   form fails on the existing ID instead of applying twice.

**Reserved types:** `sale` and `sale_reversal` are written only by the future payment webhook and refund flow, never
from the admin UI. Returns are **not** restocked automatically, because hygiene-sensitive items may not be resellable.
Staff record `returned_to_stock` explicitly, linked to the order.

**History:** the admin product page lists `stockMovements` for the product, newest first. This needs one composite
index: `stockMovements (productId ASC, at DESC)`.

## 5. Order fulfilment

**State machine** for `fulfilmentStatus`. `paymentStatus` is **never** writable from admin.

| From | Allowed to | Extra condition |
|---|---|---|
| `unfulfilled` | `packed` | payment is `paid` |
| `unfulfilled` | `cancelled` | payment is `awaiting_payment` or `failed` (a paid order needs the refund flow — pending) |
| `packed` | `dispatched` | payment is `paid`; courier and tracking note recorded (optional fields) |
| `packed` | `unfulfilled` | reason required |
| `packed` | `cancelled` | same as unfulfilled → cancelled |
| `dispatched` | `delivered`, `returned` | — |
| `delivered` | `returned` | reason required |
| `returned`, `cancelled` | — (terminal) | — |

**`setFulfilmentStatus({ orderId, to, expectedFrom, expectedUpdatedAt, note, dispatch? })`** runs in a transaction. It
validates the transition and the payment condition, then appends to `order.audit`:
`{ at, actor: "admin:<uid>", type: "fulfilment_changed", detail: "packed → dispatched · <note>" }`.
It updates `updatedAt` and refuses stale writes.

**Schema addition (additive):**
`OrderSchema.dispatch: z.object({ courier: z.string(), trackingRef: z.string().optional(), trackingUrl: z.string().url().optional() }).optional()`

**Privacy:**
- Order contact and address data appear only on `/admin/orders/**` behind `requireAdmin()`.
- List views show reference, region, totals and statuses. The full name and phone appear on the detail page.
- Nothing about orders is logged except the order ID and reference.

**Payment status today:** with no payment provider, every order stays `awaiting_payment`, so packing is blocked by
design. The admin UI says "Payment integration pending — orders can't be packed yet." See open question Q2 about cash
on delivery.

---

## 6. Shared-file edits I'm requesting approval for

| File | Change | Effect on public site |
|---|---|---|
| `src/lib/domain/schemas.ts` | Add `StorefrontSettingsSchema`, `MediaAssetSchema`, `StockMovementSchema`, `AdminAuditEventSchema`. Add optional `ImageRef.mediaId`, `Product.updatedAt`, `Product.updatedBy`, `Product.firstPublishedAt` (added in step 3 to enforce the §2a slug lock), `Order.dispatch`, and `Category.visibility` (default `"public"`). | None. All additions are optional or defaulted, and existing documents still parse. |
| `src/lib/data/storefront.ts` | **New** `getStorefrontLead()` (§1), plus a demo-mode equivalent. | Codex swaps the "first featured" logic in `page.tsx` for this. I won't touch `page.tsx`. |
| `src/lib/data/demo-catalog.ts` | Add demo storefront settings pointing at the demo serum. | Demo only. |
| `src/lib/firebase/admin.ts` | Add `adminAuth()` and `adminStorage()` beside `adminDb()`. Read `FIREBASE_STORAGE_BUCKET`. | None. |
| `src/lib/data/catalog.ts` | `getCategories()` filters `visibility === "public"`. | Hidden categories disappear from public pages (none are hidden today). |
| `firebase/firestore.rules` | **Close every client write**, including `orders` updates (closes the gap noted in the handoff). Add read-deny for `settings`, `media` and `auditEvents` (server-only). | None. The storefront uses the Admin SDK. |
| `firebase/storage.rules` | Close client writes; uploads go through the server only (§2). Public read unchanged. | None. |
| `firebase/firestore.indexes.json` | `stockMovements(productId, at desc)`, `orders(fulfilmentStatus, createdAt desc)`, `auditEvents(entityId, at desc)` | None. |
| `firebase.json` | Nothing new; the emulators already cover Firestore, Auth and Storage. | — |
| `src/app/robots.ts` | Add `disallow: /admin`. **This is Codex-owned**, so I'm asking Codex to make the edit (or approve mine). | Crawlers skip `/admin`. |
| `package.json` | Add `firebase` (client SDK, sign-in only) and `@firebase/rules-unit-testing` (dev). Possibly `image-size` for dimension checks if `sharp` isn't available. | Client SDK is loaded only on `/admin/sign-in`. |
| `.env.example`, `README.md` | New variable names: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (public by design), `FIREBASE_STORAGE_BUCKET`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST`. | — |
| `INTEGRATION_PLAN.md`, `TEST_PLAN.md` | Update the admin, stock and review rows as the work lands. | — |

**I won't touch** `src/app/page.tsx`, other public routes, public components/styles, `layout.tsx`, `globals.css`, or
`proxy.ts` (none exists; I don't plan to add one).

**Claude-only new files:** `src/app/admin/**`, `src/components/admin/**`, `src/styles/admin.css`, `src/lib/admin/**`
(session, actions, transitions), `scripts/admin-access.ts`, `tests/unit/admin/**`, `tests/rules/**`.

## 7. Open questions for John

| # | Question | My default if no answer |
|---|---|---|
| Q1 | **Staff sign-in method:** Google accounts, or email + password? | Email + password, with Google added later. Multi-factor needs Firebase's paid Identity Platform upgrade — worth it for the owner account. |
| Q2 | **Will Lordnoble accept cash / MoMo on delivery?** If yes, packing an unpaid order must be allowed, and payment needs a "collected on delivery" path. That changes §5. | No. Online payment only, and packing requires `paid`. |
| Q3 | Who are the first admin users? Is a single `admin` role enough for launch, or should staff have limited roles (e.g. orders only)? | A single `admin` role now; roles are added later through the same claim mechanism. |
| Q4 | Admin session length. | 8 hours, with sign-in again on expiry. |
| Q5 | Which Firebase project (ID, owner, region)? | Build against the emulator only until it's confirmed. |

## 8. Build order once approved

1. Schemas, rules, indexes and rules tests in the emulator. This needs **JDK 21**.
2. Auth: sign-in, session, `requireAdmin()`, provisioning script, sign-out.
3. Products: list/search, create/edit draft, publish checklist, preview.
4. Media library and upload, and attaching images to products.
5. Stock adjustment and history.
6. Lead-product and hero settings (unblocks Codex's home page).
7. Orders: list, detail, fulfilment transitions.
8. Reviews moderation queue.
9. Dashboard: pending orders, low stock, unpublished drafts.

After each step I report local and emulator results separately. I never touch production.
