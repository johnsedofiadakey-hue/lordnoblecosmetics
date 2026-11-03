# Lordnoble Cosmetics — Design Direction v1

**Design owner:** Codex  
**Implementation owner:** Claude  
**Purpose:** This is the visual source of truth for the first build. It complements `LORDNOBLE_PROJECT_PLAN.md`; it does not authorise a production release.

## The visual promise

**Confidence, in Motion** is an immersive beauty ritual, not a conventional online-shop template.

The customer should feel a progression from atmosphere to personal care to confident purchase:

`Desire → ritual → understanding → product → bag → delivery`

Lordnoble should feel warm, luminous, mature, and premium. It must never become clinical, sugary, or visually noisy.

## Hero motion-stage reference

The approved direction for the next build pass is stored at:

[`design-assets/lordnoble-hero-motion-stage-v2.png`](design-assets/lordnoble-hero-motion-stage-v2.png)

This is a **visual direction asset**, not final advertising artwork. It deliberately contains no person and no product packaging: Claude should layer real, approved Lordnoble packshots into the open central stage in HTML. Do not add text into the image itself; all messaging must remain live HTML.

### Hero composition

- Use the asset as a full-bleed scene; it has protected dark quiet space in the left 38% for the live headline and an open central plinth zone for real product packshots.
- Keep the sculptural ring and satin as atmosphere. The live product stack is the focal point and should be placed in the central stage, never over the headline.
- Desktop content sits on the left aligned to the site grid, vertically centred around 50–56% of the hero height.
- Use a soft dark wine gradient only behind the copy if contrast needs reinforcement; do not darken the entire scene.
- Hero target height: `min(880px, 100svh)` on desktop, `720px–820px` on mobile depending on viewport. The first CTA must remain visible without excessive scrolling.

### Draft live copy hierarchy

The precise campaign line can change later, but hierarchy should be implemented now:

```
LORDNOBLE COSMETICS / THE RITUAL EDIT
Beauty that moves with your confidence.
Care made to feel as good as it looks.
[ Shop the ritual ]  [ Find your care ]
Authentic products · Nationwide Ghana delivery
```

Use no more than two CTAs. “Shop the ritual” is primary; “Find your care” opens the discovery route/section.

## Design foundations

### Colour tokens

Use the following as working tokens; tune slightly only after contrast testing against the actual logo and photography.

| Token | Value | Intended use |
|---|---:|---|
| `--lordnoble-wine-950` | `#2B0711` | deepest scene overlay, rich footer |
| `--lordnoble-wine-800` | `#5D0B20` | primary buttons, active states |
| `--lordnoble-wine-650` | `#7C1731` | secondary wine surfaces |
| `--lordnoble-blush-100` | `#F8E7E3` | soft section background |
| `--lordnoble-ivory-50` | `#FFFDF9` | main page background |
| `--lordnoble-gold-500` | `#B58A45` | small accents, rules, icon details |
| `--lordnoble-plum-900` | `#26131A` | primary reading text |
| `--lordnoble-mist-200` | `#EDE5DF` | borders and quiet UI surfaces |

Avoid gold for body text. Wine buttons need white/ivory text at a contrast-compliant weight. The palette should be applied in large calm surfaces, not as multiple gradients in every card.

### Typography

Recommended pairing:

- **Display:** `DM Serif Display` or `Cormorant Garamond` — fluid, editorial, never all-caps for long headlines.
- **UI/body:** `Manrope` or `Inter` — small labels, prices, filters, descriptions, and controls.

Typography rules:

- Main hero statement: clamp approximately `3.4rem` to `7.4rem`, line-height `0.88–0.96`, max 5–7 words per line on desktop.
- Section headings: high-contrast serif, clear enough to work without decorative images.
- Eyebrows: UI font, spaced uppercase, very small but contrast-safe.
- Product names/prices: UI font; price should never be visually subordinate to a decorative label.
- Do not use more than two font families or more than three weights per family.

### Spacing and form

- Maximum content width: 1440px; standard desktop gutter: clamp(24px, 5vw, 80px).
- Base vertical section rhythm: 112–160px desktop, 72–104px mobile.
- Prefer generous blank space, large images, and asymmetric editorial grids.
- Product commerce cards may have a subtle `16px–20px` radius; avoid pill-shaped everything.
- Lines, labels, and icons should be restrained and fine—not ornamental clutter.

## Homepage art direction

### 1. Hero — opening scene

The page begins in the campaign world. Navigation is initially light and transparent over the image, then transitions to an ivory compact sticky bar after scroll.

**Motion:** headline lines rise in with a masked reveal; small label fades in; CTA appears last. The backdrop receives only a slow `2–4%` transform/parallax shift. One or two real product packshots can drift a few pixels in depth and the thin gold orbit may draw on scroll. There are no decorative botanicals or model movements in this opening scene.

### 2. Ritual finder — “Choose the care that meets you”

Five large pathways, each acting as a doorway into one product world. Do not use a five-up strip of same-size ecommerce cards.

Suggested desktop layout: a large lead tile plus four smaller tiles in an offset editorial grid. On mobile: one large swipeable/tap-first stack with pagination/progress that does not trap scroll.

| Ritual | Visual world | Motion cue |
|---|---|---|
| Feminine Care | blush, soft rose petals, quiet warmth | soft blooming image reveal |
| Body Care | glossy burgundy liquid, satin, fruit/plant cues | flowing horizontal line |
| Skin Rituals | luminous ivory, glass, dew, bright texture | light passing over image |
| Wellness | roots, leaves, dark glass, warm gold | botanical depth/parallax |
| Beauty Tools | polished chrome, plum, precise shadow | measured product rotation/tilt |

### 3. Featured ritual — proof meets desire

Create an immersive horizontal editorial section, not a generic promotional banner.

- One large product scene or split image layout.
- Include a concise benefit statement, honest ingredient/feature callouts, and a three-step use ritual.
- Keep `Shop this ritual` close to product price and availability.
- Desktop may use pinning for a short sequence only; mobile should use a normal stacked layout.

### 4. Signature shelf — commerce without losing the mood

The product grid must become quieter after the campaign modules so the shopper can compare confidently.

- Image-first cards with an ivory surface, minimal border, and ample product space.
- Hover: product image moves upward by a few pixels, summary/actions fade in; no card flips.
- Mobile: a single tap must expose any quick action, with a direct product link always present.
- Use live price, real availability, and verified rating information only.

### 5. The Lordnoble standard — animated proof ribbon

Use a deep wine field with five concise proof points: authentic products, Ghana delivery, secure payment, quality care, and customer support.

The visual device can be a slow moving thin gold line or a gentle icon stagger—not a continuously racing marquee. Ensure all content is readable with animation disabled.

### 6. Reviews and journal — human confidence

Reviews should use warm portraits or simple customer initials only with permission. Design them like slim editorial notes, not oversized speech bubbles. The journal should be image-led, useful, and visually calmer than the hero.

### 7. Closing scene

End with a full-width wine/blush campaign composition and a single clear shopping action. It should feel like the final image of a beauty film, followed by a calm, practical footer.

## Product-detail art direction

The product page is a confidence page, not a product-spec dump.

1. Large image gallery on the left (or stacked at mobile); product information clear on the right.
2. Name, purpose, GHS price, availability, quantity, and add-to-bag appear before detailed content.
3. Use a discreet gold rule to divide commercial information from ritual storytelling.
4. Present approved “Why you’ll love it”, “How to use”, and “Ingredients / product details” in readable accordion or anchored sections.
5. Keep delivery/payment reassurance directly adjacent to purchase controls.
6. Follow with reviews and complementary ritual products.

No extreme animation is needed on this page: product gallery fades, a subtle add-to-bag response, and section reveals are enough.

## Interaction and motion specification

### Motion feel

Slow, assured, material. Think silk easing across a surface—not bouncy UI microinteractions or dramatic app-like transitions.

| Interaction | Timing | Suggested behaviour |
|---|---:|---|
| Hero entry | 700–1200ms total | staggered mask/opacity reveal, one sequence only |
| Section reveal | 450–700ms | image clip/opacity + 16–32px upward text movement |
| Card hover | 180–260ms | small translate and shadow/metadata reveal |
| Add to bag | 220–350ms | button confirmation + restrained bag-count transition |
| Navigation change | 200–300ms | colour/background transition, no full-screen loader |

Use `power2.out`, `power3.out`, or a similarly soft custom curve. Avoid elastic/bounce eases.

### Required accessibility behaviour

- When `prefers-reduced-motion: reduce` is enabled, remove parallax, mask motion, scroll triggers, and decorative loops; retain instant or short fades only.
- Keyboard focus must remain visible against wine and image backgrounds.
- Nothing important is communicated by hover, colour, or motion alone.
- Decorative imagery has empty alt text; meaningful product imagery has useful alternative text.

## Responsive rules

- Prioritise mobile composition rather than shrinking desktop: crop/choose the hero image so the face and product are not cut off.
- Hero copy sits over a predictable quiet/gradient zone, never over the subject’s eyes or product label.
- Use `svh` / resilient sizing to handle mobile browser chrome without hiding CTAs.
- Desktop may express richer image layering; mobile should use a single decisive image plane and shorter motion.
- Filter sheets, bag controls, and quantity controls must be touch-sized (minimum 44px interactive target).

## Image and asset treatment

- Never distort packshots. Use `object-fit: contain` for product cards and reserve their layout dimensions.
- Use `object-fit: cover` only for editorial/campaign imagery and check focal points at every breakpoint.
- Prefer AVIF/WebP derivatives in the final app, retaining the original source safely.
- Lazy-load below-the-fold media; preload only the hero source actually used at the current responsive width.
- Do not place text, claims, or prices inside generated/photographic assets. Keep every conversion-critical item editable in the interface.

## Design review checklist for Claude handoff

- [ ] Hero retains a strong left copy field and right editorial subject/product arrangement.
- [ ] Burgundy, blush, ivory, and antique gold feel deliberate and meet contrast requirements.
- [ ] The customer encounters ritual discovery before a dense product grid.
- [ ] Real product imagery and commercial information are never compromised for motion.
- [ ] Mobile layout feels intentionally composed, with no desktop crop failures.
- [ ] Reduced-motion mode retains a fully usable, beautiful route to purchase.
- [ ] No generic SaaS gradients, bouncing animations, purple palette, stock AI-looking imagery, or unapproved wellness claims.

## Explicit decision points for the next design pass

1. Confirm final logo, legal brand line, and preferred display typeface.
2. Obtain the actual product packshots and decide which collection/product anchors the launch campaign.
3. Decide whether the hero uses an approved original model photograph, product-only art direction, or an edited hybrid.
4. Approve the homepage design composition before Claude builds the final visual layer.
