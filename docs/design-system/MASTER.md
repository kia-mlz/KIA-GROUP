# Kia — Design System (MASTER)

Global source of truth for the کیا UI. Page-specific deviations live in
`docs/design-system/pages/<page>.md` and override this file. If no page file exists, this
file applies exclusively.

Implementation lives in `apps/group/src/styles/base.css` (tokens + primitives). Every other
stylesheet consumes tokens and must never hard-code a hex value.

---

## 1. Product concept

کیا is a Persian-first (RTL) adaptive learning platform for Iranian learners who want
to become employable developers. Two front doors:

| Door | Audience | Emotional job |
| --- | --- | --- |
| **Material Studio** (`/material`) | Any visitor, no account | "Free, instantly useful — this team knows design." |
| **Education** (`/education`) | Iranian learner, phone OTP | "Tell me honestly where I stand, then guide me." |

The learner spine is **assess → measure → roadmap → buy → learn → prove**. Every screen must
answer *where am I in that spine* and *what is the single next action*.

Therefore the design language is **diagnostic, not decorative**. It is a control room for a
learner's career: calm dark ink, one electric accent for agency, mint for earned progress,
amber for value and reward.

### Design principles

1. **One next action per screen.** Exactly one primary button. Everything else is quiet.
2. **Progress is the hero.** Mint is reserved for things the learner earned. Never decorate with it.
3. **Honest measurement.** During a live test the UI reveals nothing about correctness — no
   green, no red, no icons. Scoring is silent until `/readiness/results`.
4. **Modular bento.** Content lives in composable tiles of varied span, not long scroll walls.
5. **Persian-first typography.** Line-height and letter-spacing are tuned for Vazirmatn, not Latin.
6. **Restraint in motion.** 120–260ms, colour/shadow/border only. Never animate layout.

### Style

**Kia Bento** = Bento Box Grid + block typography + soft layered depth + a single aurora glow
per hero.

- Light ✓ Full / Dark ✓ Full
- Performance: excellent (CSS Grid, no blur on scroll surfaces except the top bar)
- Accessibility: WCAG AA, verified ratios in §2

### Anti-patterns (do not ship)

- Claymorphism, bubbly/candy shapes, mascots — this is a career product, not a kids app.
- Emojis as icons. Use `lucide-react` only.
- Glassmorphism on content cards (only the sticky top bar and modal backdrops may blur).
- `transform: scale()` on cards (causes layout shift + text reflow). Use `translateY(-2px)`.
- Neon-on-neon. Max 2 accent colours visible in any one viewport.
- Purple gradients on everything. Gradient is a brand moment, not a default.
- Arbitrary z-index. Use the scale in §6.

---

## 2. Colour

Four brand seeds, each expanded to a ramp so we always have an accessible step available.

| Seed | Hex | Role |
| --- | --- | --- |
| Periwinkle | `#6464FF` | Brand identity, agency, primary action, focus (= Kia) |
| Mint | `#C4EED9` | Earned progress, success, completion |
| Amber | `#FFC864` | Value, reward, premium, price, warning (= kia., reserved) |
| Ink | `#0E1626` | Foundation, dark surfaces, all text |

### Department identity tokens

Each department owns exactly one colour. They are **not** free palette picks —
they are the published kia. brand values, defined once in
[`packages/brand`](../../packages/brand) (`src/tokens.ts` + `css/brands.css`) and
consumed as CSS custom properties. Never hard-code these hexes in a component.

| Token | Brand | Hex |
| --- | --- | --- |
| `--group-gold` | kia. (parent — reserved, no department may use it) | `#FFC864` |
| `--dept-academy` | Kia | `#6464FF` |
| `--dept-work` | Kia Work | `#6492FF` |
| `--dept-material` | Kia Material | `#148165` |
| `--dept-labs` | Kia Lab | `#28C793` |
| `--dept-events` | Kia Event | `#E32B1B` |
| `--dept-community` | Kia Community | `#FF7344` |

Text on a department fill is chosen by measured WCAG contrast
(`readableInk` in `@kia./brand`), not by eye — see
`apps/group/src/styles/base.css` (`.dept--<slug> { --tile-on-fill }`). Tests pin
both the values and the ink choice on the TypeScript and CSS sides.

### Ramps

**Brand — periwinkle**

```
50 #F0F0FF   100 #E5E5FF   200 #C9C9FF   300 #A9A9FF   400 #8A8AFF
500 #6464FF  600 #4F4FE8   700 #3E3EC4   800 #2F2F96   900 #23236B
```

**Mint — progress / success**

```
50 #F2FCF7   100 #E3F8EE   200 #C4EED9   300 #9FE0C0   400 #6FCCA2
500 #46B385  600 #2E9269   700 #237552   800 #1B5A3F   900 #12402D
```

**Amber — value / reward**

```
50 #FFF9EC   100 #FFF2D4   200 #FFE3A8   300 #FFD68A   400 #FFC864
500 #F5AE33  600 #C87F0D   700 #96590A   800 #713F08   900 #4E2C06
```

**Ink — neutral (hue-matched to `#0E1626`)**

```
0 #FFFFFF   25 #FBFBFE   50 #F5F6FB   100 #EAECF5   200 #D6DAE9
300 #B4BBD2  400 #8891AF  500 #626C8C  600 #47506D   700 #333B54
800 #1E2739  900 #141C2E  950 #0E1626
```

**Danger** `50 #FEF2F3 · 200 #FBC9CD · 400 #F0787F · 500 #E0495A · 600 #C42D40 · 700 #9B2231`

### Verified contrast (WCAG AA = 4.5:1 body, 3:1 large/UI)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `ink-950` on `#FFFFFF` | 18.6:1 | AAA body |
| `ink-600` on `ink-50` | 7.6:1 | AAA muted body |
| `ink-500` on `#FFFFFF` | 5.2:1 | AA faint text — smallest allowed |
| `#FFFFFF` on `brand-600` | 5.8:1 | AA — **this is the primary button fill** |
| `brand-700` on `#FFFFFF` | 8.0:1 | AAA link/text |
| `mint-700` on `#FFFFFF` | 5.6:1 | AA success text |
| `amber-700` on `#FFFFFF` | 5.6:1 | AA value text |
| `ink-950` on `amber-400` | 15.4:1 | AAA — amber CTA uses **ink text**, never white |
| `ink-950` on `mint-200` | 15.9:1 | AAA |
| `brand-400` on `ink-950` | 6.8:1 | AA dark-mode link |
| `ink-300` on `ink-950` | 9.4:1 | AAA dark-mode body |
| `#7C87A8` on `ink-950` | 5.1:1 | AA dark-mode faint |

> `brand-500` (`#6464FF`) on white is only **4.4:1**. It is the *identity* colour — use it for
> fills of large elements, gradients, glows, borders and icon accents. For text and for solid
> button fills carrying white text, step to `brand-600`/`brand-700`.

### Semantic assignment

| Meaning | Light | Dark |
| --- | --- | --- |
| Page background | `ink-50` + aurora wash | `ink-950` + aurora wash |
| Card surface | `#FFFFFF` | `ink-800` |
| Raised surface | `ink-25` | `ink-700` |
| Sunken surface | `ink-100` | `ink-900` |
| Hairline border | `ink-200` | `rgba(154,164,206,.16)` |
| Body text | `ink-950` | `ink-100` |
| Muted text | `ink-600` | `#A9B2CE` |
| Faint text | `ink-500` | `#7C87A8` |
| Primary action | `brand-600` fill / white text | `brand-600` fill / white text |
| Focus ring | `brand-500` @ 40% | `brand-400` @ 45% |
| Progress / done | `mint-700` text, `mint-200` track fill | `mint-400` text, `mint-700` fill |
| Value / reward | `amber-700` text, `amber-400` fill + ink text | `amber-400` text |
| Destructive | `danger-600` | `danger-400` |
| Code surface | `ink-950` | `#0A1120` |

### Colour rationing

Any single viewport shows **at most two** of {brand, mint, amber} as saturated fills. Ink and
white carry the rest. This is what keeps a 4-colour palette from looking like a toy.

---

## 3. Typography

Persian is the primary script; the scale is tuned for Vazirmatn first.

| Role | Family | Notes |
| --- | --- | --- |
| Persian UI + display | **Vazirmatn** 400–800 | `line-height: 1.8` body, `1.28` headings, `ss01` on |
| Latin display / headings | **Sora** 500–800 | geometric, technical, confident |
| Latin body | **Inter** 400–700 | high x-height, excellent at 13–15px |
| Code / numerals | **JetBrains Mono** 400–600 | also used for prices, timers, scores, ranks |

Latin numerals in Persian UI are wrapped in `.ltr-isolate` so prices, timers and code never
mirror.

### Scale

| Token | Size | Line | Tracking | Use |
| --- | --- | --- | --- | --- |
| `--fs-display` | `clamp(2.25rem, 5.5vw, 3.75rem)` | 1.08 | -0.03em | Landing hero |
| `--fs-h1` | `clamp(1.75rem, 3.6vw, 2.5rem)` | 1.18 | -0.025em | Page title |
| `--fs-h2` | `clamp(1.375rem, 2.4vw, 1.75rem)` | 1.25 | -0.02em | Section |
| `--fs-h3` | `1.125rem` | 1.35 | -0.01em | Card title |
| `--fs-body-lg` | `1.0625rem` | 1.75 | 0 | Lead paragraph |
| `--fs-body` | `0.9375rem` | 1.7 | 0 | Default |
| `--fs-sm` | `0.875rem` | 1.6 | 0 | Secondary |
| `--fs-xs` | `0.8125rem` | 1.5 | 0 | Meta |
| `--fs-micro` | `0.75rem` | 1.45 | 0.02em | Labels, badges |

RTL never uses `text-transform: uppercase` or positive `letter-spacing` — both break Persian
shaping. The existing `[dir='rtl']` reset list in `base.css` enforces this.

---

## 4. Space, radius, elevation

**Space** — 4px base: `4 8 12 16 20 24 32 40 56 72 96`. Bento gap `16px` mobile / `20px` desktop.
Section rhythm `--space-section: clamp(56px, 9vw, 96px)`.

**Radius** — `xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill 999`. Cards use `lg`, tiles `xl`,
controls `sm`/`md`. Nested radius is always ≤ parent − 6px.

**Elevation** — five steps, ink-tinted (never pure black):

```
--shadow-xs   0 1px 2px rgba(14,22,38,.06)
--shadow-sm   0 2px 8px -2px rgba(14,22,38,.10)
--shadow-md   0 10px 28px -12px rgba(14,22,38,.18)
--shadow-lg   0 24px 60px -24px rgba(14,22,38,.26)
--shadow-xl   0 40px 96px -32px rgba(14,22,38,.34)
```

Plus intent glows: `--glow-brand`, `--glow-mint`, `--glow-amber`. Elevation and hairline border
always ship together — a card is never a shadow alone (invisible in dark mode).

---

## 5. Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Colour, opacity |
| `--dur-base` | 180ms | Hover, border, shadow |
| `--dur-slow` | 260ms | Panel reveal, accordion |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Default |
| `--ease-spring` | `cubic-bezier(.34,1.4,.64,1)` | Badge/reward pop only |

Hover = colour + border + shadow + `translateY(-2px)`. Never `scale`. Aurora hero glow drifts
on a 14–18s loop. Everything decorative is disabled under `prefers-reduced-motion: reduce`;
only loading indicators keep animating.

---

## 6. Z-index scale

```
--z-base 0 · --z-raised 10 · --z-sticky 20 · --z-dropdown 30
--z-overlay 40 · --z-modal 50 · --z-toast 60
```

Arbitrary values such as `z-index: 9999` are forbidden.

---

## 7. Component contracts

**Button** — `.btn` + variant + size. Variants: `--primary` (brand-600 fill, white),
`--accent` (amber-400 fill, ink text), `--secondary` (surface + hairline), `--ghost`
(transparent), `--danger`. Sizes `--sm 36px`, default `44px`, `--lg 52px`. Every button has
`cursor: pointer`, a visible `:focus-visible` ring, and a `:disabled` state at 45% opacity
with `cursor: not-allowed`. Icon-only buttons require `aria-label`.

**Card / tile** — surface + hairline + `--shadow-sm`, radius `lg`. Interactive cards add
`cursor: pointer`, hover border `brand-300`, hover `--shadow-md`, `translateY(-2px)`.

**Bento** — `grid-template-columns: repeat(12, 1fr)`, tiles span 12/6/4/3. Reflow: 12 → 6 → 12
at 1024px / 640px. Tiles: `.tile--wide` (8), `.tile--half` (6), `.tile--third` (4), `.tile--tall` (2 rows).

**Field** — label always visible (never placeholder-as-label), 44px control, hairline border,
`brand-500` focus ring, error text in `danger-600` with an icon (never colour alone).

**Chip / badge** — pill, `--fs-micro`, tinted background + matching text step. Intents: neutral,
brand, mint, amber, danger.

**Stat** — mono numeral at `--fs-h2`, label at `--fs-micro` in faint ink.

**Progress** — `ink-100` track, mint fill, always paired with a visible numeric percentage.

### Data visualisation

| Data | Chart | Notes |
| --- | --- | --- |
| Readiness domain scores | Radar (existing SVG) | 5 axes; always paired with a labelled bar list |
| Score vs pass threshold | Bullet | Threshold marker + numeric value as text |
| Module completion | Progress bar / waffle | Percentage text always visible |
| Revenue over time | Line | ≥4 points, else stat card |
| Payment mix | Stacked 100% bar | Never a pie |

Numbers are always present as text, never hover-only. Series differ by more than colour.

---

## 8. Pre-delivery checklist

- [ ] No emoji icons; `lucide-react` only, consistent 24px viewBox
- [ ] `cursor: pointer` on every clickable element
- [ ] Transitions 120–260ms; no `scale` on cards
- [ ] Light mode body text ≥ 4.5:1; faint text never below `ink-500`
- [ ] Borders visible in **both** themes
- [ ] Visible `:focus-visible` ring on every interactive element
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375 / 768 / 1024 / 1440; no horizontal scroll
- [ ] RTL verified: no mirrored code/prices/timers, no uppercase Persian
- [ ] Live test screens leak no correctness signal
- [ ] Every form input has a visible label
- [ ] No hard-coded hex outside `base.css`
