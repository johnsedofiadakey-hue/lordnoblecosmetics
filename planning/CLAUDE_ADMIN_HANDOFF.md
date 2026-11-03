# Claude handoff — Lordnoble Cosmetics admin portal

**Project:** `/Users/truth/Developer/Lordnoble Cosmetics`  
**Status:** Planning brief for implementation after John approves the overall plan. Do not deploy or populate production as part of building the portal.  
**Public-site owner:** Codex + John. **Admin owner:** Claude.

## Goal and current state

Build the operational `/admin` in the **existing Next.js 16 / React 19 / TypeScript / Firebase** project. The public experience will lead with Skin Glow Serum and use Firestore product data. The repo already contains schemas, server catalogue/order access, Firestore/Storage rules, and public shopping routes. It does not contain admin routes. README labels the project Gate A, local only; payment/webhook and real product data are pending. The working tree is entirely untracked, with no Git remote. Preserve it and coordinate a baseline before editing.

Read `AGENTS.md`, `CLAUDE.md`, `LORDNOBLE_PROJECT_PLAN.md`, `LORDNOBLE_DESIGN_DIRECTION.md`, `CONTENT_AND_ASSETS.md`, `INTEGRATION_PLAN.md`, `README.md`, `src/lib/domain/schemas.ts`, `firebase/firestore.rules`, and `firebase/storage.rules` before implementation. The current public homepage `src/app/page.tsx` is owned by Codex.

## Required admin capabilities

1. **Access:** Firebase Auth sign-in, server-verified admin authorization using an `admin: true` custom claim, protected admin routes/actions, sign-out, and a safe first-admin provisioning procedure. No self-elevation in the UI. Use claims only for access control. Firebase documents [custom-claim authorization](https://firebase.google.com/docs/auth/admin/custom-claims).
2. **Catalogue:** List/search/filter products; create/edit drafts; preview/publish/unpublish; validate the existing `ProductSchema`; manage slug, category, price in integer pesewas, compare-at price, size, descriptions, ingredients, how-to-use, approved benefits/claims, warnings, SEO, featured/home placement, and visibility. Preserve existing IDs/slugs when editing. Prevent publication of invalid sellable products.
3. **Media:** Upload approved product and campaign images to the existing Storage locations, record alt text and dimensions, assign/reorder images, preview before publish, and allow safe replacement. Keep concept artwork clearly separate from approved product photos. Validate file type, size and dimensions server-side as well as with Storage rules.
4. **Categories and homepage placement:** Maintain five category records and their public visibility/order. Give Skin Glow Serum an explicit hero/feature selection mechanism agreed with Codex, rather than depending on whichever product sorts first.
5. **Inventory:** Show stock and stock history. Adjust stock only through a server-owned operation that records reason, actor, previous/new quantity, timestamp, and a `stockMovements` entry atomically. No arbitrary client write to the numeric stock field.
6. **Orders:** Search/view orders, immutable customer and line-item snapshots, payment status, fulfillment status, delivery details, and audit history. Permit only valid fulfillment transitions. Never provide a manual “mark paid” control; payment status comes from verified provider events. Do not expose order PII outside admin.
7. **Reviews:** Queue, approve/reject, edit only according to an agreed moderation policy, retain consent evidence and provenance, and publish only approved real reviews. No seeded endorsements.
8. **Operational dashboard:** Small, factual summaries of pending orders, low stock and unpublished content. Avoid invented revenue numbers or unverified conversion metrics.

## Security and data contract

- Use the existing `ProductSchema`, `CategorySchema`, `ReviewSchema`, `OrderSchema` and server repositories where possible. Propose shared schema changes before making them so the public and admin builds stay compatible.
- Privileged server code must verify the user's token/session and `admin` claim on **every** mutation. Firebase server libraries [bypass Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions), so rules alone cannot protect Admin SDK operations. Use least-privilege runtime configuration and keep credentials server-side.
- Current rules permit admin browser updates to `/orders/{id}`. Tighten that path when admin order mutations are server-owned; otherwise a direct client edit could bypass transition and audit checks. Apply similar discipline to stock and payment-sensitive fields. Test allowed/denied rules with the emulator.
- Use Firestore transactions for operations that change a value based on its current state, especially stock and order transitions. Firebase [documents atomic transactions](https://firebase.google.com/docs/firestore/manage-data/transactions). Keep an append-only audit event for business-critical changes.
- Treat payment and fulfillment as separate state machines. No client/admin mutation may produce `paid` or a stock decrement without a verified, idempotent provider flow. The provider is not yet selected; keep payment integration as a separate assigned deliverable and show honest pending status in admin until it exists.
- Never store raw payment details or secrets in product/admin records. Do not print service-account keys, provider secrets or customer PII in logs.

## File ownership for parallel work

**Claude owns:** `src/app/admin/**`, admin-only components/styles, admin auth/session helpers, admin-only server operations, and focused admin/rules tests. Claude may propose changes to `firebase/**`, `src/lib/domain/schemas.ts`, `src/lib/data/**`, and shared configuration, but must coordinate those changes before landing them.

**Codex owns:** `src/app/page.tsx`, other public routes, public layout/header/footer/components/styles, campaign motion, and public browser QA. Avoid editing these from the admin branch. A shared admin login page can use its own layout.

Use a separate branch or worktree after the untracked project is safely baselined. Merge through a reviewable diff. Keep Firebase project configuration, secrets, deployment, and real data out of implementation commits.

## Acceptance evidence

- Non-admin user cannot load admin data or invoke any admin mutation; admin can sign in and sign out.
- Draft product remains hidden publicly; published valid product appears on shop/PDP, with price and stock exactly as saved. Unpublishing removes it from public queries.
- Image upload validates type/size, records alt text, and renders correctly in responsive public slots after publication.
- Stock adjustment writes one consistent stock value and one traceable movement; concurrent changes cannot silently overwrite each other.
- Order fulfillment follows valid transitions and records actor/time; payment cannot be marked paid through the admin UI or direct browser write.
- Review approval requires provenance/consent; only approved reviews appear publicly.
- Typecheck, lint, focused tests and Firebase emulator rules tests pass. Supply screenshots at desktop and mobile admin widths plus a concise manual walkthrough. Report local/emulator results separately from any production state.

## First coordination checkpoint

Before implementation, provide Codex and John with a short proposed contract for **hero product selection**, **campaign media**, **admin authentication/session**, **stock adjustment**, and **order fulfillment**. Identify every planned shared-file/rules edit. The public and admin work can then proceed without overwriting each other.
