# Implementation Status — Kia Academy

> Persistent project memory (per master build contract §7). The repository is the source
> of truth; this file tracks phase state, gates, and pending work. Updated 2026-10-11.

## Context

The platform was **rebuilt** around a Persian-first product shape (see
[`REBUILD_ARCHITECTURE.md`](./REBUILD_ARCHITECTURE.md)). The original master-spec phase
list (Phases 0–37) was largely superseded by the rebuild; the security/quality backlog
now lives in [`AUDIT.md`](./AUDIT.md) and the go-live gates in
[`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md).

## Current state (this session)

| Gate | Status |
| --- | --- |
| Dependencies installed (pnpm, frozen env templates copied) | ✅ |
| PostgreSQL 16 via `pnpm docker:db` (kia-postgres) | ✅ |
| 18 Prisma migrations applied (latest: `20260926120000` EXAM-3 question snapshots) | ✅ |
| Seed data present (6 users · 4 courses · 266 lessons) | ✅ |
| `pnpm typecheck` (shared + api + web) | ✅ |
| `pnpm lint` (all workspaces) | ✅ |
| `pnpm test` — 317/317 (shared 46, web 118, api 153) | ✅ |
| `pnpm build` (production, 355 static pages) | ✅ |
| `pnpm audit --prod` — 0 vulnerabilities (17 resolved via workspace overrides, 2026-09-29) | ✅ |
| Runtime smoke (`scripts/smoke.sh`, 29 probes incl. phone-only registration + OTP + password + 2FA flows) | ✅ |

## New this session

### Merge note — two different "AUTH-6"s reconciled (2026-10-03)

`main` and this session's branch had each closed a different audit item under
the same AUTH-6 label: `main` hardened the email `register` endpoint against
enumeration (anti-timing, silent verify link, welcome email), while this
session **removed** public email registration entirely (phone/OTP-only,
see AUTH-6 below). On merge, the phone-only product decision won: the
`register()` service method, its `register.dto.ts` endpoint and the five
dedicated register specs from the main-side hardening were dropped again,
along with the now-orphaned `DUMMY_HASH` timing absorber and
`issueEmailVerificationLink` helper. Everything from main that does not
depend on email registration is kept — the `type=verify` reset-token
semantics (used by profile email changes), EXAM-4 retake limits, the e2e/GHCR
pipelines, Docker fixes and backup/restore scripts.

### UX-2 — one account menu for sign out, color mode and language (implemented this session)

These three controls existed in **three** places at once: a standalone sign-out
button in the nav, `LanguageSelector` + theme toggle duplicated between the
desktop `top-right` cluster and the mobile burger sheet. All three now live in a
single place — the user-chip dropdown (`TopBar`), which is reachable on desktop
and on mobile:

- **خروج / Sign out** — moved out of `top-nav` into the dropdown (danger row).
- **حالت / Mode** — one row showing the *current* value («روشن»/«تیره», new
  `nav.modeLight` / `nav.modeDark` keys) instead of an anonymous ◐ glyph; the
  icon switches Sun/Moon so state is readable at a glance.
- **زبان / Language** — the `LanguageSelector` sits inside the dropdown, and its
  option list was re-skinned to **flow inline** (`position: static`, no float-out
  box-shadow panel) so it reads as one menu rather than a popover escaping a
  popover.
- **ویرایش اطلاعات کاربری** — profile editing (`/dashboard/profile`) joins the
  menu next to «همه دوره‌ها», reusing the same `panel.nav.profile` label the
  sidebar shows so the two never disagree. Menu order is now: courses ·
  profile ————— color mode · language ————— sign out.
- **Dead CSS removed:** every `.top-nav-tools` rule (layout.css + two
  responsive.css blocks) went with the element — the mobile sheet is now
  navigation only, verified in the DOM at 390px.
- **Duplicate nav entries removed:** «همه دوره‌ها» appeared three times (sidebar,
  top-right cluster, user menu). The `all-courses` item was dropped from
  `LearnerNav`, and the standalone `all-courses-btn` (with its whole
  `.top-right-tools` wrapper) was dropped from `TopBar` — that wrapper held
  nothing else once language and mode moved into the menu, so ~60 lines of dead
  CSS across `layout.css` + `responsive.css` went with it (including the
  `.user-chip-name` hide rule, which was re-scoped rather than deleted). The
  sidebar is now پنل · دوره‌های من · تیکت‌ها · پیام‌ها · پروفایل · متریال
  (+ جوایز), and the catalog is reachable from the user menu and the footer.
- The landing page keeps its own language/theme controls: guests have no user
  chip, and `SiteChrome` hides the whole bar for them.

### UX-1 — dedicated post-auth landing with only three doors (implemented this session)

Product decision: after registration + profile completion **and** after every
successful login, the user lands on a page that contains **nothing but three
buttons** — «کارفرما و فریلنسر»، «آموزش»، «متریال». The full dashboard panel stays
one click away (sidebar) but is no longer the landing surface.

- **New route `/home`** (`apps/group/src/app/home/page.tsx`): a centered,
  deliberately sparse page holding nothing but the three doors — the page
  heading was dropped on review so the choice is the only thing on screen.
  Gated by `RequireAuth learnerFlow`, so guests are pulled into the phone OTP
  flow and users with an incomplete profile are sent back to it.
- **`HubDoors`** (`apps/group/src/components/hub/HubDoors.tsx`): the three-door
  block was lifted out of the dashboard into a shared component, so `/home` and
  `/dashboard` can never drift apart.
- **One source of truth for the path:** `HOME_PATH` is exported from
  `apps/group/src/lib/postLoginPath.ts` and consumed by the landing redirect,
  `resolvePostLoginPath`, the education flow, `TopBar`'s logo and the freelance
  back button.
- **Entry points retargeted to `/home`:**
  - `/` — signed-in users with a completed profile `router.replace(HOME_PATH)`.
  - `resolvePostLoginPath` — learners now default to `/home` (including the
    `next=/` and rejected-open-redirect fallbacks). Staff still go to `/admin`,
    and learner **deep links are still honored** (`next=/roadmap` → `/roadmap`).
  - `education` `continueAfterProfile()` — no `next` deep link means profile
    completion lands on `/home` instead of the assessment page; its CTA copy
    became `education.start.homeCta` («مشاهده مسیرها») to match.
  - `TopBar` logo click — used to fork on `hasRoadmap` (`/dashboard` vs
    `/education`); now always `/home`, so the `useApp().hasRoadmap` dependency
    was dropped from that component.

**Follow-up — «آموزش» splits into two directions.** The education door now
opens `/tracks` instead of the course catalog, and that page holds exactly two
doors:

- **تکنولوژی** → `/tracks/technology`, which splits once more into **همه دوره‌ها**
  (`/courses`, the catalog) and **آزمون ارزیابی** (`/assessment`, the wizard →
  readiness test → roadmap). The assessment page's back button now points at
  `/tracks/technology` instead of `/education`, so the branch has no dead ends
  in either direction.
- **زبان‌های خارجی** → `/tracks/language`, an honest coming-soon page. There is
  no language content in the catalog today, so rather than ship a dead link it
  states plainly what is being built (level-adaptive, like the technology
  path), captures the demand through `/contact`, and offers the technology
  catalog as an alternative. This is the seam where a real language track
  (courses + a `language` track key + its own assessment) slots in later.
- **Doors keep working destinations:** `/freelance`, `/tracks`, `/material`,
  `/events`. `/freelance`'s back button points at `/home` instead of
  `/dashboard`.

### UX-3 — fourth department: events (implemented this session)

`/home` (and the dashboard panel) now carry **four** doors — employer/freelancer,
education, material and **events** — laid out two columns × two rows
(`.landing-doors--depts`; the old 3-column variant was renamed away since no
other page used it).

- **Horizontal breathing room.** `.hub` declared `padding: <block> 0 <block>`,
  and that shorthand zeroed the `.container` inline padding
  (`var(--space-6)` = 24px) for **every** hub page — so each door grid sat flush
  against both viewport edges. Switched to `padding-block`, which keeps the
  container gutter. `/home`, `/tracks`, `/tracks/technology`,
  `/tracks/language` and `/events` now all measure 24px inset on both sides
  (verified against `main`'s box, not `innerWidth`, since the panel rail eats
  one edge).
- **Brand name highlighted in the departments heading.** `HubDoors` wraps the
  academy name in `.dash-doors__brand` (brand colour) inside the otherwise
  plain `dashboard.doors.heading`. The heading stays **one** translated string
  and is split at render time around `common.brand`, because the two locales
  put the name in different positions (fa «دپارتمان‌های کیا آکادمی», en «Kia
  Academy departments») — and separate lead/tail keys could not express "no lead
  word": `createTranslator` tests `if (primary)`, so an empty-string part is
  treated as missing and silently falls back to the other locale (caught in the
  browser — Persian rendered «… کیا آکادمی departments»). If the brand string is
  ever absent from the heading, it degrades to plain text.
- **Fourth accent colour.** With four doors the existing three accents no
  longer gave the events door its own identity — mint/brand/amber were spoken
  for, and reusing the `danger` ramp would have signalled "error". A small
  `--sky-*` palette (`300/500/600` plus `--sky-tint` / `--sky-hairline`) was added
  in `base.css` for both themes, and `.door--events` / `.door-icon--sky` use it.
  The four doors are now mint · indigo · amber · sky, distinct in both themes
  (verified by computed `border-top-color` and icon background in light *and*
  dark).
- **`/events`** is a new hub for competitions, bootcamps, webinars and meetups.
  Three of its four tiles lead somewhere real: چالش‌ها و مسابقه‌ها → `/bootcamp`,
  بوت‌کمپ‌ها → `/bootcamp`, لیدربرد و جوایز → `/rewards`. The fourth
  (وبینار و میتینگ) is **not a link** — it is marked «به‌زودی», gets
  `cursor: default` and a neutral hover so it does not read as tappable, and
  the page closes with a `/contact` CTA plus the weekly challenges as the
  alternative. Same honesty rule as the foreign-language page: no dead links.
- **Header trimmed:** the `/events` head is now just the `<h1>` («رویدادها و
  مسابقات») — the eyebrow badge and subtitle paragraph were removed along with
  their now-unused `events.badge` / `events.sub` keys in both locales (the
  dashboard panel's `/dashboard/events` uses its own `panel.events.sub` and
  is untouched).
- Verified live in the preview: `/` → `/home`, education start step → `/home`,
  freelance back → `/home`, `/home` → `/tracks` → `/tracks/technology` →
  `/assessment`, and the language coming-soon page (a real layout bug was caught
  and fixed there: `.bento` is a 12-column grid, so bare `.tile` children
  collapsed to one column — they need `tile--half`).

**Navigation shape now in place:** `/home` (3 doors) → `/tracks` (technology ·
foreign languages) → `/tracks/technology` (all courses · assessment test). Every
leaf is a real page.

### UX-4 — back buttons return to the page you came from (implemented this session)

Every «بازگشت» control used to be a hard-coded path, so it lied about where the
user actually was: open `/bootcamp` from the home hub and its back button sent
you to `/dashboard`; in the lesson player it always dropped you on `/courses`
even when you arrived from another lesson. Back is now **history-first**, with
the old path kept only as a fallback.

- **`BackLink`** (`apps/group/src/components/layout/BackLink.tsx`) — a real
  `<a>` that intercepts only the plain left click and calls `router.back()`;
  middle-click, ctrl/cmd-click, the no-JS case and the fallback `href` all keep
  working. `PageBackButton` renders it, so all ~30 pages that already used the
  shared control became history-aware without touching their call sites.
- **Manual back links converted** to `BackLink`: `MaterialStudio` (`home-btn`),
  the two `education` flow `back-link`s, the lesson player's error-state link,
  and the four admin `admin-back` links (`courses/new`, `courses/[slug]/edit`
  ×2, `users/create`). Since it still renders an anchor, no CSS changed —
  including the `a.home-btn` rules in `material-studio.css`.
- **Why `document.referrer` is not enough:** it belongs to the *document
  load*, so it goes stale as soon as the user moves around the SPA (a page
  reached by three client-side hops still reports the original referrer, often
  empty). `lib/historyBack.ts` keeps a per-tab stack of visited paths in
  `sessionStorage`, fed by the new `HistoryTracker` (mounted once in
  `ClientProviders`, keyed on `usePathname`). Re-visiting a known path rewinds
  the stack instead of appending, so browser back/forward keeps it aligned with
  the real history; the stack is capped at 50 entries.
- **Fallback stays honest:** typed URLs, bookmarks, external links and
  links opened in a new tab produce no in-app history, so those pages fall back
  to their explicit `href` (e.g. `/events` → `/home`) rather than a dead back.
- Verified live: `/home` → `/tracks` → `/tracks/technology` walks back
  `/tracks` → `/home`;  `/home` → `/bootcamp` (fallback `/dashboard`) walks back
  to `/home`; `/material` and a direct `/events` visit behave as described.
  `pnpm typecheck`, `pnpm lint`, `pnpm test` (242/242) and `pnpm build` green.

*Superseded on placement by UX-5 below: the `BackLink` mechanism and the
history stack stay, but the control is now rendered once by the shells instead
of once per page.*

### UX-5 — one back control, one fixed slot, one label (implemented this session)

The back control existed in ~30 places with different wording
(«بازگشت به پنل»، «بازگشت به دوره‌ها», «بازگشت به آرنا»…) and different
positions (top of the container, inside a card header, next to a timer, in the
Material Studio top bar, as the `actions` slot of a panel header). It is now
rendered **by the shells only**, so its position cannot drift:

- **One slot.** `SiteChrome` renders `PageBackButton` as the first child of
  `<main>`, above whatever the page renders; the admin shell renders it
  directly under the admin header, above `.admin-page-content`. The slot is
  styled once (`.page-back-wrap`: `max-width: var(--shell-max)`, centered,
  `padding: var(--space-5) var(--space-6) 0`), so the pill lands on the content
  column's inline start edge at the same offset on every page — measured
  identical (108×42 pill, same left inset, same top) on `/courses`, `/material`,
  `/contact`, `/tracks/technology`, `/dashboard/tickets` and at 390px width.
  Admin re-skins only the colours (`variant="admin"` → admin surfaces); the
  geometry is the same rule.
- **One label.** `PageBackButton` lost its `label` prop: the text is always
  `common.back` («بازگشت» / "Back"), so no page can word it differently.
- **Per-page copies removed** from 29 files (`PageBackButton` usages, the
  `education` / lesson-player `back-link`s, four admin `admin-back` links and
  the Material Studio `home-btn`), plus the 404 page's «بازگشت به خانه» CTA —
  that page now gets the standard control from the shell. Two now-dead
  variables went with them (`checkout`'s `backHref`, `roadmap`'s
  `testCompleted`).
- **Dead CSS deleted:** `.admin-back` (admin.css + its two entries in
  admin-contrast.css), `.back-link` (buttons.css + the education-page rule in
  auth.css), `.ch-top .page-back-wrap` (bootcamp.css) and every `.home-btn` /
  `.material-topbar` rule in `material-studio.css`. `not-found.tsx` keeps only
  its heading and copy.
- **Dead i18n removed** from both dictionaries (9 keys, fa/en kept in sync):
  `contact.backHome`, `lesson.backToCourses`, `readiness.gate.backAssessment`,
  `readiness.results.backTest`, `bootcamp.backDashboard`, `bootcamp.solver.back`,
  `roadmap.backResults`, `admin.courses.back`, `auth.forgotPassword.backToLogin`.
  `readiness.results.backDashboard` stays — it is a CTA, not the back control.
- **Roots are exempt** (`lib/pageBack.ts`): `/`, `/home` and `/admin` carry no
  back pill, because a back control there would only point at itself.
  Everything else — including `/dashboard`, `/login` and `/cart`, which had
  none before — has exactly one.
- **Fallbacks** are per-shell (`/` for the site, `/admin` for the admin panel)
  and only used when there is no in-app history. `/` is the right site target
  for both audiences: guests get the landing page, a signed-in learner is
  forwarded to the departments hub by the landing page itself.

### UX-6 — content never sits flush against the column edge (implemented this session)

Reported on `/courses`: the catalog was glued to both edges of the content
column. Root cause is the same class of bug UX-3 hit on `.hub` — page shells
that also carry `.container` declared vertical rhythm with the **padding
shorthand** (`padding: <block> 0 <block>`). `.container`'s gutter
(`padding-inline: var(--space-6)`) has the same specificity and loses to any
later shorthand with `0` on the sides, so the whole page lost its 24px gutter.

- **12 rules fixed** across 6 stylesheets, all switched to `padding-block` so
  `.container`'s inline padding survives: `.dash`, `.challenge-shell`,
  `.rewards` (bootcamp.css), `.catalog-shell`, `.lesson-shell`, `.legal-shell`
  (catalog-lesson.css), `.gate`, `.test-shell`, `.results` (readiness.css),
  `.result-shell` (roadmap.css), `.wizard-shell` (wizard.css), `.checkout-result`
  (checkout-result.css). `.auth-shell`, `.cart-shell` and `.checkout-shell` were
  already correct (their shorthands keep a non-zero inline value).
- **Mobile rule repaired:** at ≤640px the lesson studio dropped its gutter
  entirely (`padding-inline: 0`); it now tightens to `var(--space-3)` (12px)
  instead of reaching the edge.
- **Reason recorded where it bites:** `.container` in `base.css` now carries a
  comment explaining why shells must use `padding-block`.
- **Regression guard:** `src/styles/container-gutter.test.ts` collects every
  class rendered together with `.container` (parsed from the TSX), then asserts
  (a) `.container` keeps a non-zero inline gutter and (b) no such shell sets a
  `padding` shorthand or `padding-inline/left/right` that zeroes it. Verified it
  *fails* when the original `.catalog-shell` bug is reintroduced, then passes
  again with the fix in place.

### UX-7 — the top bar shows the brand mark alone on mobile (implemented this session)

On phones the top bar carried the full «KIA ACADEMY» wordmark next to the
language toggle, cart, avatar and burger — four controls plus a long wordmark in
one 390px row. The wordmark is now hidden for the whole mobile range, not just
below 360px:

- `responsive.css` (`max-width: 900px`, the project's mobile breakpoint — the
  same edge where the panel switches from the horizontal bar to the desktop
  sidebar): `.topbar .logo-text` is `display: none`. The now-redundant
  `max-width: 360px` `.logo-text` hide was removed.
- The mark itself is untouched and stays centred in the bar
  (`grid-column: 2`), so the brand still reads and still navigates home.
- **Accessibility:** with the text hidden the button would have had no
  accessible name, so the logo button carries `aria-label={BRAND_WORDMARK}` —
  same string, named in both modes.
- Verified in the preview at 390px (wordmark `display: none`, mark visible,
  label `KIA ACADEMY`) and at 1280px (wordmark still visible).

### UX-8 — one «تیکت‌ها» entry in the learner menu (implemented this session)

The panel sidebar had «تیکت‌ها» as an expandable group whose only submenu item
was «تیکت جدید» — a second way to reach a button the tickets page already shows.

- **Tickets is now a leaf link** to `/dashboard/tickets`
  ([LearnerNav.tsx](apps/group/src/components/layout/LearnerNav.tsx)); the sidebar
  is a flat list of four sections: پنل · دوره‌های من · تیکت‌ها · پیام‌ها. On
  `/dashboard/tickets/new` the single entry still shows as active (`is-active` +
  `aria-current="page"`, prefix match), so the user keeps their place.
- **Ticket creation is untouched:** the list page's «+ تیکت جدید» button
  (`app/dashboard/tickets/page.tsx`), the dashboard ticket card
  (`TicketsCard`) and the per-course link all still lead to
  `/dashboard/tickets/new`. The `panel.nav.newTicket` / `panel.nav.previousTickets`
  strings stay — they label those buttons, not the menu.
- **Dead group machinery removed** now that no section has children: the
  `NavItem` union, `openGroups` state + its effect, the `ChevronDown` /
  `ClipboardList` imports and the group branch of the render
  ([LearnerNav.tsx](apps/group/src/components/layout/LearnerNav.tsx)), plus
  `.learner-nav-group*`, `.learner-nav-label`, `.learner-nav-children`,
  `.learner-nav-chevron*` in [panel.css](apps/group/src/styles/panel.css) and the
  two compact-mode hide entries in [layout.css](apps/group/src/styles/layout.css).
- The desktop sidebar's icon-only compact mode needs no JS: `.panel-nav--compact`
  already hides `.learner-nav-text` in CSS, so the `compact` prop was dropped
  from `LearnerNav` and from the `TopBar` call site.
- Verified in the preview at 390px and 1280px: 4 flat entries, exactly one
  containing «تیکت», zero `.learner-nav-group*` elements in the DOM.

### UX-9 — the footer is rebuilt minimal (implemented this session)

The footer was the densest surface left in the product: a four-column grid
(brand + blurb + tagline + three headed link columns), a divider row and a
bottom row. Measured height: **308px** on desktop, **665px** on a 390px phone.

- **New shape** ([Footer.tsx](apps/group/src/components/layout/Footer.tsx),
  [footer-nav.css](apps/group/src/styles/footer-nav.css)): one flex row — brand,
  then every footer link inline (no group headings, no per-link icons), then the
  trust/copyright line. Gone: `.footer-main`, `.footer-brand p`,
  `.footer-tagline`, `.footer-nav-group`, `.footer-bottom` and the three
  media-query blocks that re-flowed them.
- **Navigation.** All nine destinations (پنل · دوره‌ها · ارزیابی رایگان ·
  آزمون آمادگی · نقشه راه من · ارنه بوت‌کمپ · تماس · حریم خصوصی · شرایط) were
  first kept inline here, then **removed entirely in UX-14**. The Enamad trust
  seal and the copyright stay on every screen.
- **Phone treatment:** centred three-line block, `padding-block: var(--space-4)`,
  20px mark, tight gaps; the «پلتفرم یادگیری تطبیقی» status label is dropped
  below 640px (marketing copy, not trust/legal), and at ≤360px the link gap
  tightens again. Measured: **150px** at 390px (−77%) and **102px** at 1280px
  (−67%).
- **Brand link now uses `HOME_PATH`** like the top-bar wordmark (UX-1 made it
  the single source of truth for «go home»), instead of the stale `/dashboard`.
- `padding-block` is used for the footer's own spacing — a `padding` shorthand
  here would zero the `.container` gutter and glue the footer to the column edge
  (the UX-6 failure mode).
- Dead i18n removed from both dictionaries (parity re-verified: 2363 keys each):
  `nav.footer.blurb`, `nav.footer.tagline`, `nav.footer.learning`,
  `nav.footer.legal`. `nav.footer.explore` stays as the links' `aria-label`.

### UX-10 — signing out always lands on the landing page (implemented this session)

Product rule: after sign-out the user goes straight to the first page (`/`).
The learner menu already did that, but the **admin** panel sent staff to
`/login?next=/admin`, and — worse — every sign-out raced the page it was on:
clearing the session made that page's auth gate redirect in the same tick, so
the sign-out was undone. Measured before the fix: `/dashboard` → **exit** →
`/education?next=%2Fdashboard`.

- **One destination, one flag.** `AuthProvider` gained `signedOut`: set by
  `logout()` before the session clears, cleared by the next successful sign-in
  (`applyLearnerState`) and by `finishSignOut()` once the landing page is on
  screen. `logout({ keepPage: true })` is the opt-out used by the login screen,
  where a learner session is swapped for staff credentials without navigating.
- **Gates stand down.** `RequireAuth`, `DashboardGate`, the inline gate in
  `/assessment` and the admin shell's login gate all skip their redirect while
  `signedOut`. The admin shell's ad-hoc `leavingToSiteRef` was removed in favour
  of the shared flag (one mechanism, and `useRef` with it).
- **The current page is unmounted during the transition** (`SiteChrome`): that
  is what actually disarms the *inline* gates that no shared component owns
  (`/dashboard`, `/dashboard/my-courses`, …) and it stops protected content from
  flashing after sign-out. `SiteChrome` also calls `finishSignOut()` when the
  landing route arrives, so the flag cannot stay stuck (a stuck flag would blank
  every later page).
- **Admin sign-out rows unified:** «خروج» and «بازگشت به سایت» both run
  `handleSignOut()` → `router.replace('/')`. The learner menu uses
  `router.replace('/')` too (not `push`), so Back cannot walk back into the
  signed-in panel.
- Verified live: `/dashboard` → **خروج** → single navigation to `/`, session
  cleared, guest landing rendered (hero + «ورود / ثبت‌نام»), no top bar. Signing
  back in restores the panel, its nav and the back pill.

### UX-11 — one shared page background (implemented this session)

Product rule: **every page shares one background.** Two aurora systems were
painting at once and page shells repainted over them, so routes drifted apart.
Measured before the fix: `body` carried `--gradient-aurora`
(`background-attachment: fixed`) *and* the fixed `.site-aurora` layer,
`.dash-panel` re-pasted the same gradient, and Material Studio sat on its own
opaque `radial-gradient(circle at top, …)` plus two `.bg-orb` blobs.

- **One owner.** `body` now paints only `background: var(--bg)`; the aurora
  wash belongs to `.site-aurora` (fixed, `inset: 0`, `z-index: var(--z-base)`),
  which `SiteChrome` renders on every non-admin route. Admin keeps its own dark
  shell and skips the layer. The duplicated `background-image` /
  `background-attachment: fixed` and the now-dead `--gradient-aurora` /
  `--gradient-hero` tokens (both themes) are gone.
- **Local repaints removed.** `.dash-panel` (learner panel) and
  `.material-studio-root` are transparent; the studio's `--ms-root-a/b`
  gradient and its `.bg-orb orb-a/orb-b` markup, CSS and `driftA/driftB`
  keyframes are deleted — its glass panels now read against the shared
  background in both themes.
- **Guard:** `apps/group/src/styles/page-background.test.ts` (7 tests) pins the
  invariant — `body` paints the base colour only, no second aurora token
  exists, `SiteChrome` wires `SiteAurora`, and none of the 19 page roots
  (`.dash-panel`, `.landing`, `.material-studio-root`, `.catalog-shell`, …) may
  declare a background. Re-adding a `body` gradient or a `.dash-panel` paint
  makes it fail (verified both).
- Verified live: a viewport-wide sweep (`backgroundColor`/`backgroundImage` on
  every element covering ≥90% of the viewport) reports exactly one painter on
  `/dashboard`, `/home`, `/courses`, `/contact`, `/roadmap` and
  `/learn/…` — `body` — plus the shared aurora layer, in light and dark, at
  1280px and 390px. No horizontal overflow, no nested page scroller on the
  studio. Gates: typecheck, lint, 252 tests (shared 46 · web 53 · api 153),
  build (353 static pages) all green.

### UX-12 — registration and sign-in land straight on the departments page (implemented this session)

Product rule: after the phone flow (mobile → OTP → profile) the learner goes
**directly** to `/home` (the departments page), and so does a plain sign-in. Two
extra steps used to sit in that path: the education flow ended on a «آماده‌اید»
confirmation card that needed a click, and `/login` defaulted its `next` param to
`/dashboard`, so signing in landed on the learner panel instead of `/home`.

- **Education flow** (`app/education/page.tsx`): the `start` step is gone. A
  single effect owns the onward navigation — as soon as the session reports a
  complete profile it resolves the destination and `router.replace`s to it
  (`?next=` when a gate sent the user here, otherwise `/home`), showing the
  loading card instead of flashing a stale form. Verified: phone → OTP (`123456`
  in dev) → profile lands on `/home` in one navigation, and `/education` opened
  by an already-registered user bounces to `/home`.
- **Login** (`app/(auth)/login/page.tsx`): `next` no longer defaults to
  `/dashboard`; a plain `/login` visit resolves to `HOME_PATH`, while an
  explicit `?next=` still wins (verified `/login?next=/roadmap` → `/roadmap`).
  Staff keep going to `/admin`.
- **One resolver, one place:** `resolveInternalNext()` was extracted in
  `lib/postLoginPath.ts` and now backs both `resolvePostLoginPath` and the
  education flow — same validation for `?next=` (single-slash internal paths
  only; `/`, `/login`, `//host` and absolute URLs fold into `/home`), so a
  `next` pointing back at `/education` cannot loop the flow. 4 new unit tests
  cover it (web suite 53 → 57).
- The four dead `education.start.*` keys are removed from both dictionaries
  (2358 keys each, parity still asserted by `i18n.test.ts`).
- Gates: typecheck, lint, 256 tests (shared 46 · web 57 · api 153), build (353
  static pages) all green.

### UX-13 — one card tile for every card, one colour per course (implemented this session)

Product rule: a card is the same object wherever it appears — same size, padding,
radius, shadow, hover and icon tile — and each course wears its own colour.
Before this the two families had drifted apart: department doors (`.door`) were
16:9-ish rounded panels with a 44px accent icon, while course cards
(`.catalog-card`) were plain white boxes with a small outlined pill, a three-per-
row grid at ~299px, and **every course in the same indigo**.

- **One tile, defined once** (`styles/base.css`): `.door, .catalog-card` share the
  surface, `padding: var(--space-5) var(--space-6)`, `--radius-xl`,
  `--shadow-sm`, the hover lift, a `13rem` height floor and the 44px accent icon
  tile. The accent is the only variable, supplied by a `tint--*` class —
  `brand | sky | mint | amber | rose | violet` — so a new card cannot invent its
  own box. Measured live on `/home` and `/courses`: 374px wide, radius 28px,
  padding 20px/24px, icon tile 44px (14px radius), title 28px — identical on
  both pages; heights follow the content, equal within a row.
- **Doors lost their private palette:** `.door--primary/--work/--material/--events`
  and `.door-icon--brand/--mint/--amber/--sky` are gone from both CSS and markup
  (12 tiles across `/home`, `/tracks`, `/tracks/technology`, `/events`,
  `HubDoors`); the accent now rides on the card. `.door-cta`/`.door-action` wear
  the tile accent, and `.dash-doors .landing-doors` no longer stretches past the
  48rem cap, so the panel copy of the doors is the same size as `/home`.
- **Course colours:** `lib/cardAccent.ts` hashes the course slug (FNV-1a) and
  hands out accents, skipping hues already taken *in that grid* — a course keeps
  its colour on `/courses` and «دوره‌های من», and no two cards on a page share one.
  5 unit tests cover stability, uniqueness and that every accent has a real
  `tint--*` class in `base.css`.
- **Course icons:** `CourseTileIcon` maps the free-form API icon word (`code`,
  `palette`, `briefcase`, …) to a lucide glyph so it fits the 44px square, with a
  two-letter/emoji fallback. The word used to overflow the tile (it was clipped
  mid-letter).
- **Panels kept out of it:** the course intro and the exam-result box used
  `.catalog-card` as a content panel; they are now `.catalog-panel` (same surface,
  no accent, no tile height floor).
- Verified live: `/courses` (2×2, HTML=mint, CSS=violet, JavaScript=sky,
  interview=amber), `/home`, `/dashboard`, `/tracks`, `/events`, light + dark,
  1280px and 390px with no horizontal overflow. Gates: typecheck, lint, 261 tests
  (shared 46 · web 62 · api 153), build (353 static pages) all green.

### UX-14 — the footer keeps only the brand and the trust line (implemented this session)

Product decision (asked and answered: remove the link navigation site-wide): the
footer's `<nav>` duplicated the top bar and the learner menu on every page, and on
a three-step signup form like `/education` it pushed the trust seal off the
bottom of the screen.

- **Gone:** `FOOTER_LINKS` and the whole `<nav className="footer-links">` block in
  [Footer.tsx](apps/group/src/components/layout/Footer.tsx), the `.footer-links` /
  `.footer-link` rules and their 640px + 360px media blocks in
  [footer-nav.css](apps/group/src/styles/footer-nav.css), and the nine dictionary
  entries that existed only for it (`nav.footer.explore`, `freeAssessment`,
  `courseLibrary`, `readinessTest`, `myRoadmap`, `bootcampArena`, `privacy`,
  `terms`, `contact` — removed from both locales; `copyright`, `status` and
  `enamad` stay).
- **What the footer is now:** brand at the inline-start, the Enamad badge +
  status + copyright at the inline-end (`justify-content: space-between`),
  centred and stacked on phones.
- Measured: desktop **102 → 69px**, phone **150 → 59px**; no horizontal overflow
  at 390px; the footer renders no `<nav>` on any route (verified on `/home`).
- **The legal pages stayed reachable.** `/privacy` and `/terms` were linked from
  the footer nav only, so removing it would have orphaned them; they now sit as
  two plain text links beside the copyright (`.footer-legal`, reusing the existing
  `legal.privacy.title` / `legal.terms.title` strings — no new keys). Say the word
  and they go too.
- The footer only ever rendered for registered users (`SiteChrome` gates it on
  `profileComplete`), so the guest landing page is unchanged.
- Gates: typecheck, lint, 261 tests (shared 46 · web 62 · api 153), build (353
  static pages) all green.

### UX-15 — the sidebar width control moved under «جوایز» (implemented this session)

Feedback on `/home`: the sidebar-width toggle («معمولی») sat directly under the
brand wordmark, above the account cluster and the whole navigation list, so a
**layout preference** read as if it were the first item of the menu.

- **Moved into the nav, last row.** `TopBar` renders it inside
  `<nav id="site-top-nav">` as the nav's last child, instead of as a standalone
  button in `.topbar-primary`. Measured in the preview at 1280px the nav's
  children are `learner-nav` · `button.panel-nav-size-toggle`, the toggle being
  the last element, with `.learner-nav`'s flex growth pinning it near the bottom
  of the rail. *(It sat under the «جوایز» link when this landed; that link moved
  into the account menu in UX-18, and the control kept the last-row slot.)*
- **Geometry follows the links, not the old standalone block.** The
  `layout.css` rule lost its `order: 1` (it ordered the bar's flex children,
  meaningless inside the nav column) and now matches `.panel-shell
  .top-nav-link`: `padding: var(--space-3)`, `border-radius: var(--radius-md)`,
  `flex: 0 0 auto`, `text-align: start`. Both rows measure 263×48px at 1280px.
- **Compact rail still icon-only:** the existing
  `.panel-nav--compact .panel-nav-size-toggle-label { display: none }` rule
  applies unchanged — verified at 76px rail width, the toggle is a 59px centred
  icon button sitting under the rewards trophy, same 59px width as the link
  above it.
- **Mobile untouched:** the control is desktop-only (base
  `.panel-nav-size-toggle { display: none }`, shown only inside
  `@media (min-width: 901px)`); at 390px the burger sheet still lists exactly
  the navigation links with the toggle at `display: none`.
- **Guard:** `apps/group/src/components/layout/TopBar.test.ts` (4 tests) pins the
  placement — the toggle renders once, inside the nav, after `/rewards`, with
  no element following it, and it keeps its `nav.resizeMenu` accessible name.
- Gates: typecheck, lint, 265 tests (shared 46 · web 66 · api 153), build (353
  static pages) all green.

### UX-16 — the sidebar has two widths, not three (implemented this session)

Feedback on the same control as UX-15: the «بزرگ» (wide) step only pushed the
content column to the right — it bought no extra room for the Persian nav labels
(which already fit) — so the toggle now cycles between **معمولی** (296px) and
**کوچک** (76px icon rail) only.

- **Code:** `PanelNavSize` is `'compact' | 'default'` and `PANEL_NAV_SIZES` is
  `['default', 'compact']` in [TopBar.tsx](apps/group/src/components/layout/TopBar.tsx);
  `isPanelNavSize`, `navSizeClass` and `navSizeLabel` lost their third branch.
- **CSS:** the `.panel-shell .topbar.panel-nav--wide { flex-basis: 23rem }` rule
  is deleted from [layout.css](apps/group/src/styles/layout.css), and the
  transition comment now reads *compact / default*. No other rule referenced the
  class (the compact-mode selectors were already separate).
- **i18n:** `nav.menuSizeWide` removed from **both** dictionaries (parity still
  asserted by `i18n.test.ts`); the two surviving labels are `nav.menuSizeDefault`
  («معمولی») and `nav.menuSizeCompact` («کوچک»).
- **Existing users are safe without a migration:** a stale
  `localStorage['kia-panel-nav-size'] === 'wide'` simply fails
  `isPanelNavSize()`, so the rail opens at «معمولی». Verified live: seeded `'wide'`
  → reload renders 296px, class `topbar` (no `--wide`), no horizontal overflow.
- **Verified live:** the button cycles کوچک → معمولی → کوچک (labels, rail width
  76/296px, class list) and never reaches a third state.
- **Guard:** three more tests in
  [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts) — the preset
  array holds exactly the two sizes, and no `menuSizeWide` / `panel-nav--wide`
  string survives in the component, the stylesheet or either dictionary.
- Gates: typecheck, lint, 268 tests (shared 46 · web 69 · api 153), build (353
  static pages) all green.

### UX-17 — a «دپارتمان‌ها» chip under the user chip (implemented this session)

Feedback on the sidebar: the departments hub (`/home`, four doors) was reachable
only through the brand wordmark or the «آموزش» door chain. A chip **exactly like
the user chip, directly under it**, makes it one click from every page.

- **Markup** ([TopBar.tsx](apps/group/src/components/layout/TopBar.tsx)): inside
  `.topbar-secondary`, after `.user-menu-wrap` —
  `<Link href={HOME_PATH} className="user-chip departments-chip">` with a lucide
  `LayoutGrid` mark and the label in a `.learner-nav-text` span. Reusing the chip
  class is what makes it identical: measured **263×36px**, same
  `background-color`, 1px border, 999px radius, 4px/12px padding and 13px/700
  type as the «Alex» chip, 8px below it (`--space-2`).
- **One visual gotcha, fixed:** `.user-menu-wrap` carries `order: 1`, so the
  chip needs `order: 2` in the column cluster or it renders *above* the user
  chip (DOM order alone is not enough).
- **CSS-order bug caught in the preview** ([layout.css](apps/group/src/styles/layout.css)):
  the base `.departments-chip { display: none }` was written above `.user-chip`,
  whose later `display: flex` (same specificity) beat it — the chip leaked into
  the 390px mobile bar. The rule now sits directly after `.user-chip` in the
  account-chip section, and `a.user-chip { text-decoration: none }` stops the
  anchor underline (same pattern as `a.theme-toggle`).
- **Scope:** desktop sidebar only (like the width control), so the mobile bar
  keeps just avatar + burger. Hidden for `SUPER_ADMIN`, who land on `/admin`.
- **Compact rail:** reusing `.user-chip` + `.learner-nav-text` means the existing
  compact rules apply untouched — 59px centred icon button, label hidden.
- **i18n:** one new key, `nav.departments` («دپارتمان‌ها» / "Departments") in both
  dictionaries (parity asserted).
- Verified live: chip present at y=186 under the chip at y=142; click from
  `/dashboard/tickets` → `/home` with 4 doors; `display: none` at 390px with no
  horizontal overflow.
- **Guard:** three more tests in [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts)
  — placement after `.user-menu-wrap` plus the `order: 2` rule, `HOME_PATH`
  target, and the source-order assertion that keeps the hide rule below
  `.user-chip` (verified: the guard fails when the rule is hoisted back).
- Gates: typecheck, lint, 271 tests (shared 46 · web 72 · api 153), build (353
  static pages) all green.

### UX-18 — «جوایز» moves into the account menu (implemented this session)

Feedback on the «Alex» chip: «جوایز» is a destination, not an account action, but
it was the one row of the sidebar list that duplicated what the account menu
already does. It now lives in the dropdown opened by the chip (clarified with the
user: inside the account menu, not as a second shortcut chip).

- **Markup** ([TopBar.tsx](apps/group/src/components/layout/TopBar.tsx)): the
  `a.top-nav-link` to `/rewards` (with the `Trophy` mark) is gone from the nav;
  an identical `a.user-dropdown-item` row sits directly under
  «ویرایش اطلاعات کاربری» and above the first separator, closing the menu on
  click (`onClick={() => setMenuOpen(false)}`), same as the profile row. The
  sidebar list is now پنل · دوره‌های من · تیکت‌ها · پیام‌ها, then the width
  control as its last row.
- **No i18n churn:** `nav.rewards` moved with the row, so both dictionaries keep
  the key («جوایز» / "Rewards").
- **Compact-rail overflow fixed** ([layout.css](apps/group/src/styles/layout.css)):
  the dropdown inherited `width: 100%` of the 76px rail while its own rows need
  64–109px, so every row was clipped (already true for «ویرایش اطلاعات کاربری»
  before this change, one row worse after). `.panel-nav--compact
  .user-dropdown` now sets `width: 15rem` with
  `max-width: min(100vw - 24px, 100dvw - 24px)` — measured 240px at
  1032–1272px, fully inside the viewport, zero clipped rows.
- Verified live: nav has no `/rewards` link; dropdown rows read
  «ویرایش اطلاعات کاربری» · «جوایز» · حالت · زبان · «خروج»; clicking «جوایز»
  from `/home` reaches `/rewards` (h1 «جوایز و بازشدن‌ها») and closes the menu.
- **Guard:** the old placement test is replaced by two: the toggle is the nav's
  last row, and `/rewards` appears in the dropdown but not in the nav
  (11 tests in the file).
- Gates: typecheck, lint, 272 tests (shared 46 · web 73 · api 153), build (353
  static pages) all green.

### UX-20 — one shared parent for the three preferences (implemented this session)

Color mode, language and sidebar width were in two unrelated places: theme and
language only inside the account menu, width at the end of the nav. They now
share one parent, `.rail-controls`, pinned to the foot of the rail.

- `.panel-shell .rail-controls` is a flex column with `order: 4` (clearing the
  logo `1`, account cluster `2`, nav `3`) and `margin-top: auto`, so the three
  rows hold their place at the bottom however the nav grows. The width control
  left the nav for it; the nav is navigation only now.
- **Three defects found while measuring the new group**, all fixed:
  - `.topbar button.lang-toggle` pins `min-width: 86px` so the pill matches the
    mobile bar; inside the 59px compact row it overhung the rail and pushed the
    icon **13px off the icon column**. `min-width: 0` in the scoped rule.
  - Left to their own content the rows disagreed — **48.19 / 46 / 48.19** —
    because `.lang-code` is an 11px span while `.rail-control-label` is 12px. All
    three now take `min-height: var(--control-h-lg)` and measure **52 × 263**
    (default) and **52 × 59** with glyphs at 0.5px off-centre (compact).
  - The language list anchored with `top`, so from a row at the rail's foot it ran
    **46px past the viewport bottom** and hid «فارسی». It now opens upward
    (`top: auto; bottom: calc(100% + var(--space-2))`).
- **Split by breakpoint** (decided this session): below 901px there is no rail, so
  `.rail-controls` is `display: none` and the account menu keeps theme +
  language in a `.user-dropdown-platform` group. That group and *both* of its
  separators hide together above 901px — hiding only the group would leave two
  dividers back to back in the desktop menu. The width control has no mobile
  equivalent because the mobile bar has no width to resize.
- Verified live at 1280px (both themes), compact 76px and 390px: rows equal and
  aligned, size toggle cycles + persists, theme flips and relabels, language list
  opens upward fully inside the viewport, mobile menu keeps theme + language
  with no doubled separators, desktop menu keeps neither.
- **Guard:** the parent, its three-row order, the per-breakpoint homes, the
  upward list, its inward anchoring (UX-21), the `min-width` reset and the
  shared row height are pinned in
  [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts) (28 tests);
  each fix was reverted in turn to confirm its guard fails.
- Gates: typecheck, lint, 289 tests (shared 46 · web 90 · api 153), build (353
  static pages) all green.

### UX-21 — language list opens inward out of the rail (implemented this session)

The language list was the last rail popover still anchored *outward*. The
global `.lang-menu { inset-inline-end: 0 }` pins the menu's **left** edge in
RTL, and the rail hugs the viewport's right edge — so in the 59px compact rail
the 190px list hung 131px off-screen (measured `right: 1403` against a 1280px
viewport) and `.panel-shell`'s `overflow-x: clip` left a **67px strip**: the
options «EN» / «FA» were cut off, which is what made the box "look wrong" on
click. The wide rail happened to survive the same rule (its 296px of room
swallowed the 190px list), so the bug read as compact-only.

- Fix: the existing desktop-block rule for the rail list also flips the
  anchor — `inset-inline-start: 0; inset-inline-end: auto` — exactly as
  `.mini-cart` and `.user-dropdown` already do, so all three rail popovers now
  open inward. The *global* rule keeps its outward default: the mobile bar's
  pill sits left of centre, where the opposite direction is the only one that
  fits, so this stays an override inside `@media (min-width: 901px)`.
- Measured at 1280×860 after the fix: compact `left: 1082 → right: 1272`
  (flush with the rail's inline-start edge, `w: 190`, both options fully
  inside), default `left: 1074 → right: 1264` (was `1001 → 1191`, i.e. it is
  now aligned to the rail edge instead of floating 73px inside it), still
  opening upward with `bottom == toggle-top`. At 390px `.rail-controls` stays
  `display: none` and the account-menu copy keeps `position: static`, so the
  mobile list is untouched (`36 → 248`, inside the viewport).
- **Guard:** pinned in [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts)
  — the override's two declarations, the global rule keeping `inset-inline-end: 0`
  with no `inset-inline-start`, and the override's position *inside* the 901px
  media block (brace-matched, so a rule moved after the block fails too).
- Gates: typecheck, lint, 289 tests (shared 46 · web 90 · api 153), build (353
  static pages) all green.

### UX-22 — the wordmark sits exactly mid-height in the rail (implemented this session)

`.logo` already centred the brand row with `align-items: center`, and the
measurements agreed — line-box centre, button centre and the mark's box centre
all landed on **39.72px**. But the *wordmark ink* rode **1.99px above** it, so
«KIA ACADEMY» looked lifted off the mark.

- **Why.** `[dir='rtl'] .logo { font-family: var(--font-fa) }` renders the
  Latin caps in pelak, whose font box is 17px ascent + 9px descent at
  17px — the descent is reserved for Persian descenders (ی، ج، …) that
  "KIA ACADEMY" never draws. Centred half-leading therefore leaves the cap
  band high: measured cap ink 11px tall, entirely above the baseline. The
  offset is **line-height-independent** (half-leading cancels out), so no
  line-height or `align-items` change can fix it — it needs a real nudge.
- **Fix:** `.panel-shell .logo .logo-text { transform: translateY(2px) }` in
  the desktop block. `transform` rather than padding/margin so the row keeps
  its measured 39.44px height and stays flex-centred. Verified by rasterising
  the string with the exact font (canvas `measureText` advance 104.16px +
  −0.34px letter-spacing × 10 = 100.76px against the DOM's 100.83px, so the
  measurement font is the real one) and scanning ink pixels:
  ink bbox centre **37.73 → 39.73** against a parent centre of 39.72 — from
  1.99px high to **0.01px**, and equal to the mark's centre. Confirmed on a 3×
  magnified screenshot before and after.
- Scoped to the rail: the compact rail and the mobile bar both hide the
  wordmark (`display: none`), and the mark stays centred in the 34px compact
  row to 0px.
- **Known, not fixed:** the footer wordmark (`.footer-logo-text`, 16px/28px) has
  the same defect — ink 1.5px above its parent centre. Left alone to keep this
  change to the annotated element.
- **Guard:** pinned in [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts)
  — the `translateY(2px)` value, the ban on padding/margin/line-height in that
  rule, its position inside the 901px block (brace-matched), and the global
  `.logo-text` staying transform-free. Removing the rule and swapping the nudge
  for `padding-top` both fail it.
- Gates: typecheck, lint, 290 tests (shared 46 · web 91 · api 153), build (353
  static pages) all green.

### UX-25 — every department gets its own colour, and the parent gets the gold (implemented this session)

Six departments, six unmistakable colours — and one colour that belongs to none
of them.

- **Palette.** `--dept-*` tokens in `base.css` are the single source: a
  department's **tile and its logo both read from the same token**, so the card
  in the hub and the page it opens can never drift apart.

  | Department | Token | Hex | Read |
  | --- | --- | --- | --- |
  | KIA Academy | `--dept-academy` | `#6464ff` | indigo (as specified) |
  | KIA Work | `--dept-work` | `#e8590c` | orange |
  | KIA Material | `--dept-material` | `#9646dc` | violet |
  | KIA Events | `--dept-events` | `#e0495a` | rose |
  | KIA Community | `--dept-community` | `#0e8fa8` | teal |
  | KIA Labs | `--dept-labs` | `#46b385` | mint |

  `.dept--<slug>` sets `--dept` and derives the tile fill, hairline, tint, glow
  and hover from it; `.dept-mark--<slug>` paints the KIA emblem in it. Measured
  live: all six resolve to those exact hexes, distinct, in both themes.
- **The reserved colour.** `--group-gold: #ffc864` belongs to kia. alone,
  and every parent emblem now wears it: rail, footer, guest landing, auth pages
  and the admin control room (`.logo-mark`, `.footer-logo-mark`,
  `.landing-brand-mark`, `.education-brand-mark`, `.admin-brand-mark`).
  Verified computed: `#ffc864`.
- **A real collision, found and fixed.** `--amber-400` **is** `#ffc864`, and
  `tint--amber` painted its tile with it — on the language track inside KIA
  Academy and the leaderboard inside KIA Events, i.e. gold was showing up
  *inside departments*. `tint--amber`'s fill moved to `--amber-500` (`#f5ae33`),
  which also freed Work's amber from being a near-twin of the parent gold.
- **Department logos.** Each department page now carries the KIA emblem in its
  own colour on its own row above the title: `/tracks`, `/freelance`, `/events`,
  `/community`, `/labs`, plus `/material` (inside the Material Studio header,
  which is a feature component rather than a page shell).
- **Guard:** new [departmentColors.test.ts](apps/group/src/components/brand/departmentColors.test.ts)
  (10 tests) — the gold token, all five parent emblems, six distinct department
  hexes, none equal to `#ffc864`, Academy actually blue (channel arithmetic, not
  a name), tile and logo reading the same token, `tint--amber` off the gold, and
  the markup (`dept--<slug>` on all six cards, `dept-mark--<slug>` on all six
  departments). Three mutations were reverted one at a time: a department taking
  `#ffc864`, two departments sharing a hue, and the rail emblem reverting to
  brand blue — each failed the exact test that names the rule.
- Gates: typecheck, lint, 317 tests (shared 46 · web 118 · api 153), build (355
  static pages) all green.

### UX-30 — the hub's two rows carry different weights (implemented this session)

Six departments, three columns, two rows — and the rows no longer weigh the
same. The top row is the department's official colour at full strength with a
white glyph; the bottom row **echoes the row above it**: each card wears a light
mix of the department directly over it, with a dark glyph.

| Column (RTL, right → left) | Top row | Bottom row |
| --- | --- | --- |
| 1 | KIA Academy `#6464ff` | KIA Work — light academy, `#cdcdff` |
| 2 | KIA Events `#ff8a3d` | KIA Community — light events, `#ffd9c1` |
| 3 | KIA Material `#20bfa9` | KIA Labs — light material, `#b8ebe4` |

- **Hub-only.** `.door--soft` overrides `--tile-*`, never `--dept`, so a soft
  KIA Work tile is not a rebrand of KIA Work: the department's page header, its
  rail chip and its coming-soon tile still read `--dept-work`. The borrowed hue
  is named once per card as `data-tone="academy|events|material"`, and
  `.door--soft[data-tone='<slug>']` is what maps it to `--dept-<slug>` — a card
  therefore cannot tint itself with a colour that is not one of the six. Mix is
  `color-mix(in srgb, var(--tone) 32%, #ffffff)`.
- **The glyph rule was requested, and it costs contrast on two fills.** White on
  academy is 4.37:1 (fine), but white on **events is 2.35:1** and on **material
  2.31:1** — under the 3:1 WCAG minimum for a non-text graphic, where the dark
  ink would measure 7.71:1 and 7.82:1. The bottom row is excellent either way
  (11.9:1, 13.7:1, 13.8:1). If legibility on the top row is ever reported,
  changing `.door--strong` to the department's measured ink is a one-line fix;
  `.dept--*` already holds that value per department.
- **Two source-text assertions had to change, not weaken.** Both pinned the
  literal `className="door dept--<slug>"`, which the new row modifier breaks;
  they now match the department class anywhere in the list
  (`className="door[^"]*\bdept--<slug>\b`), which is what they were actually
  guarding. Two new tests pin the row split and the borrowed-hue rule.
- Verified live with computed styles: top row `rgb(100,100,255)` /
  `rgb(255,138,61)` / `rgb(32,191,169)` with `rgb(255,255,255)` glyphs, bottom
  row `rgb(205,205,255)` / `rgb(255,217,193)` / `rgb(184,235,228)` with
  `rgb(14,22,38)` glyphs.
- Gates: typecheck, lint, 336 tests (shared 46 · web 137 · api 153), build green.

### UX-28 — the six official logo colours replace the tuned palette (implemented this session)

kia.'s published logo colours, applied verbatim. They are the brand's
values, not a palette tuned for this UI, and they overrule UX-26.

| Brand | Official | Replaced |
| --- | --- | --- |
| kia. | `#ffc864` | unchanged (already the reserved parent gold) |
| KIA Academy | `#6464ff` | unchanged |
| KIA Work | `#1687ff` | `#e8590c` orange |
| KIA Material | `#20bfa9` | `#9646dc` violet |
| KIA Events | `#ff8a3d` | `#e0495a` rose |
| KIA Community | `#d946ef` | `#0e8fa8` teal |
| KIA Labs | `#19c37d` | `#46b385` mint |

- **The "spread the hues" rule is gone, deliberately.** UX-26 added an angular
  rule (≥25° between departments, ≥15° from the gold, at most one department in
  the blue band). Measured, the official set would have failed all three:
  material and labs are **16.4°** apart, academy and work are **both** blues
  (240° / 211°), and events sits **14.9°** from the gold. A spread rule cannot
  coexist with the brand's own colours, so the rule was replaced by a stronger
  one — the six hexes are pinned exactly, and that is now the specification.
  The two rules that still hold are unchanged: six distinct values, and none of
  them the reserved parent gold.
- **Tile ink is now measured, not assumed.** The official fills are light, so
  white ink fails: labs' green gives **2.30:1**. Five departments moved to
  `--ink-950` (labs 7.87:1, material 7.82:1, events 7.71:1, work 5.12:1,
  community 5.23:1). Academy keeps white — 4.37:1 against the ink's 4.14:1 —
  because its indigo is the one fill dark enough for white to win. A test now
  asserts each tile wears whichever ink actually measures higher, so a future
  recolour cannot leave white ink on a pale fill.
- Both new tests were proven to fail: reverting Work to `#e8590c` fails the
  exact-hex lock, and putting white ink on Labs fails with
  `labs: #ffffff measures 2.30:1 on #19c37d, the better of the two is 7.87:1`.
  The stylesheet was restored byte-identical (`cmp`) after each.
- Verified live on `/home` and `/labs`: the six tiles compute to `rgb(100,100,255)`,
  `rgb(22,135,255)`, `rgb(32,191,169)`, `rgb(255,138,61)`, `rgb(217,70,239)`,
  `rgb(25,195,125)`, and the rail chip, rail rule, page mark and coming-soon
  tile all read the same token on the department page.
- Known limit of the official values: on the light page background the Material
  mark (`#20bfa9`) and the Labs mark (`#19c37d`) sit at ~2.3:1, under the 3:1
  WCAG minimum for a non-text graphic. Changing them is not an option — they are
  the brand's colours — so a light-on-dark or tinted plate behind those marks is
  the way to lift them if legibility is ever reported.

### UX-27 — the rail becomes the department you are standing in (implemented this session)

The sidebar rail was the one piece of chrome that stayed generic: inside KIA Labs
it still announced kia. in gold, while the page below wore the department's
colour. The rail now takes the department's identity — its mark, its colour and
its name — with the parent left visible underneath.

- **One registry, [departments.ts](apps/group/src/components/brand/departments.ts)** —
  slug, route root, icon and name for all six, and
  `departmentForPathname()`. It is the only place a department is written down:
  the rail asks it who owns the current route, and a test compares every entry
  against the hub cards, so a route, a colour class or a name cannot drift
  between the grid and the rail.
- **The rail**, in [TopBar.tsx](apps/group/src/components/layout/TopBar.tsx): the
  emblem keeps kia.'s own mark and is repainted in the department's colour
  — the same logo the department page header shows, so only the colour changes,
  never the shape. The wordmark becomes the department's name, and the
  supporting line swaps from the group's five pillars to the parent name
  **kia.** in the reserved gold — so a department still says who it
  belongs to. Outside the six routes nothing changes: gold mark, wordmark,
  pillars.
- **The root element carries `dept--<slug>`**, putting that department's token in
  scope for the whole rail, plus a 3px rule in the department colour under the
  lockup. The rule is desktop-only and hidden in the compact icon rail, where
  the recoloured emblem alone carries the identity — as the gold mark alone
  carries the group.
- **Two details found by measuring, not by looking.** `.logo:hover` paints the
  button brand-blue, and inheritance handed that to both the department name and
  the chip's icon; `--dept-*` values are tile fills and several are too light to
  read as small text (labs' mint on white), so hover now lights the rule instead.
  And the enabling rule for the underline needed `.logo--dept` to out-specify the
  global `display: none` — a media query adds no specificity of its own.
- **Route matching is on a slash boundary.** `/materiality`, `/labsx` and
  `/events-archive` are not departments; sub-routes such as
  `/tracks/technology` and `/material/pdf` are. Pinning this is the point of
  [departmentRail.test.ts](apps/group/src/components/brand/departmentRail.test.ts)
  (15 tests): a bare `startsWith` would have shipped exactly that bug.
- Verified live in the browser on `/labs`, `/community`, `/events`,
  `/tracks/technology` and `/home`: computed chip colours `#46b385`, `#0e8fa8`,
  `#e0495a`, `#6464ff` match the department tokens, and `/home` keeps the gold
  mark (`rgb(255, 200, 100)`) with the pillars line.
- Gates: typecheck, lint, 333 tests (shared 46 · web 134 · api 153), build green.

### UX-26 — Work and Community moved off confusable hues (implemented this session)

Two of the six read as near-copies, and measuring hue proved why:

- **KIA Work `#f5ae33` sat 0.7° from the parent gold `#ffc864`** — the same hue,
  so the amber department could be mistaken for kia. itself.
- **KIA Community `#2e9bea` sat 34.8° from KIA Academy `#6464ff`** — two blues in
  one six-card grid, which reads as one colour family.

Both moved rather than nudged: Work → **orange `#e8590c`** (21°, now 17.7° from
the gold) and Community → **teal `#0e8fa8`** (190°, now 52° from academy and the
only department outside the blue band). The rest of the palette is untouched.

- **The rule is now angular, not textual.** Six different hexes can still be six
  near-identical colours, so [departmentColors.test.ts](apps/group/src/components/brand/departmentColors.test.ts)
  converts each token to HSL and asserts a circular hue gap: ≥25° between any
  two departments, ≥15° between any department and the parent gold, and **at
  most one department in the cool-blue band (200–265°)** — that last rule is what
  catches the sky blue, since 34.8° is clear of the angular floor.
- **A stale colour found while verifying:** the KIA Community page's coming-soon
  tile still wore `tint--violet`, which is *Material's* violet, sitting beside
  Community's own logo. Both new department pages now paint their own tile
  (`dept--community`, `dept--labs`), and a guard pins it.
- Reverting either old colour now fails with a precise message — `work is only
  0.7° from the parent gold` and `at most one department may read as blue` — and
  both files were restored byte-identical.
- Gates: typecheck, lint, 317 tests (shared 46 · web 118 · api 153), build (355
  static pages) all green.

### UX-24 — Kia Academy becomes kia., with six departments (implemented this session)

The company name changed end to end, and the group got a department structure it
did not have: four doors became six.

- **Brand.** `common.brand` is now `کیا.` / `kia.` and the Latin
  wordmark `BRAND_WORDMARK` is `kia.`. 49 replacements across 29 files:
  both dictionaries (21 fa / 19 en mentions), page metadata, the 404 page,
  Material Studio, the financial card, demo data, the e-mail templates
  (welcome, receipt, password reset, readiness), payment invoice titles, cart
  receipts, the 2FA **TOTP issuer** (it is what an authenticator app shows
  beside the account), the API name/log line, the Prisma seed's admin name,
  `default-site-settings`, the English course catalog, the SVG `<title>`s, and
  README + AGENTS.md. The admin control room reads `مرکز کنترل گروه` /
  `Group control center`.
- **Tagline.** New `common.tagline` key renders under the brand: mark + wordmark
  stay on one line inside a new `.logo-lockup`, the tagline sits below. The logo
  became a flex column, so its horizontal alignment moved from `justify-content`
  to `align-items`, and the compact rail's centring rule was rewritten for it.
  Measured at 1280px: 205.92px wide inside the 296px rail, no overflow, 12px
  `--fs-micro`, and the UX-22 optical nudge still lands the wordmark ink
  **0.01px** off the mark's centre. Hidden where the row is one icon tall: the
  compact rail and the mobile bar.
- **Departments.** Four doors became six, named as one family — Persian
  transliterates the Latin names rather than inventing a second vocabulary:
  کیا آکادمی · کیا ورک · کیا متریال · کیا ایونتس · کیا کامیونیتی · کیا لبز
  (`dashboard.doors.*`: `educationTitle` → `academyTitle`, plus `communityTitle`
  and `labsTitle`). Each keeps its existing route; the two new ones link to new
  pages. Cards stay title-only — the activity scope of each department lives on
  its own page, matching the two description removals earlier in the session.
- **New departments.** `/community` and `/labs` are coming-soon pages built on
  the events-page shell: title, activity scope, a `door--soon` tile and a link to
  the contact form, so neither card is a dead end. Build output went 353 → **355**
  pages.
- **Guard:** new [brand.test.ts](apps/group/src/components/brand/brand.test.ts)
  (11 tests) — the wordmark and both brand strings, the tagline in both
  languages, the six hrefs and titles in both dictionaries, every card title
  routed through the dictionary, the two new pages, the tagline's placement and
  its two hide rules, and a **source sweep** that fails on any surviving
  `Kia Academy` / `KIA ACADEMY` / `کیا آکادمی`. The one allowed `کیا آکادمی` is
  the KIA Academy department title. Reintroducing the old name in `Footer.tsx`
  was caught at `Footer.tsx:25` and reverted byte-identical.
- **Also updated:** `two-factor.service.spec.ts` pinned the TOTP issuer as
  `Kia Academy`; the assertion follows the rename (`issuer=Kia+Group`) rather
  than being relaxed. The e2e spec's login heading selector follows too.
- Gates: typecheck, lint, 305 tests (shared 46 · web 106 · api 153), build (355
  static pages) all green.

### UX-23 — course tiles lost their description paragraph (implemented this session)

Every `.catalog-card` repeated the course description under the title: a 2–3 line
wall of text (measured 103.56px on the HTML and CSS tiles, 51.78px on the other
two at 1280px) that also stretched the two grid rows to different heights —
365.34px against 313.56px. Removed from **both** course-card grids, since they
share the `.catalog-card` tile and a description in one but not the other would
read as an accident:

- `apps/group/src/app/courses/public-page.tsx` (the public catalog) and
  `apps/group/src/app/dashboard/my-courses/page.tsx` (the learner grid) — one
  deleted line each; the diff is exactly that.
- No CSS compensation needed: the tiles shrank on their own from 365.34/313.56px
  to a uniform **249.78px** at 1280px (still 41.78px above the shared 13rem
  floor, void below the CTA unchanged at 21px), and 245.08px in the 390px
  single column. Each tile now reads icon → title → meta → CTA.
- `.catalog-card p` was **kept**: the dashboard card still renders a
  `<p className="panel-muted">` for «هنوز فایلی برای این دوره نیست» inside its
  attachments block, and that rule is what gives it its size and colour. Deleting
  it as "dead" CSS would have restyled that line.
- **Guard:** new [courseCards.test.ts](apps/group/src/app/courses/courseCards.test.ts)
  (4 tests) — no `course.description` inside either card, the card children still
  in icon → title → meta → actions order, `.catalog-card p` still present, and
  no `min-height: 0` / `margin-top: auto` creeping onto the shared tile.
  Restoring the paragraph in the public grid and in the dashboard grid each fail
  it; both files came back byte-identical (`cmp`).
- Gates: typecheck, lint, 294 tests (shared 46 · web 95 · api 153), build (353
  static pages) all green.

### UX-19 — rail rhythm and icon-column audit (implemented this session)

Every row of the desktop rail measured with `getBoundingClientRect` at 1280px
(rail 296px), then in compact (76px), both themes and at 390px. Five
inconsistencies found and fixed in one pass.

- **A 386px void below the nav.** `.panel-shell .learner-nav` had
  `flex: 1 1 auto` (a leftover from the expandable groups removed in UX-8), so
  it stretched and pushed the width control to the bottom of a 76px-wide rail
  that only had four rows. It is now `flex: 0 0 auto`: the toggle follows
  «پیام‌ها» directly. Verified gap chain:
  logo →(37, hairline group) cart →8 user chip →8 departments →20 nav-0
  →4×4 nav-1..3 →**0** toggle.
- **Three different icon insets.** The chips inherited `.user-chip`'s
  `padding-inline: 4px 12px` (icons 4–5px from the inline-start edge), the brand
  mark used 8px and the nav links 12px, so the icons never formed a column.
  `.panel-shell .logo` and `.panel-shell .user-chip` now both use
  `padding-inline: var(--space-3)`; measured insets are 12/13px everywhere
  (the 13 is sub-pixel rounding of the icon box), and every icon is vertically
  centred in its row.
- **Empty pill in the compact rail (bug from UX-17).** The compact hide list had
  `.panel-nav--compact .user-chip svg`, which was meant for the chevron but also
  matched the departments chip's `LayoutGrid` mark — in the icon-only rail the
  chip rendered as a 36px blank pill (`display: none` on its only child). The
  chevron now carries `className="user-chip-caret"` and the rule targets that
  class, so the chip keeps its grid icon.
- **Accessibility follow-up:** in compact mode the chip's label is
  `display: none`, so the link now carries `aria-label={t('nav.departments')}` —
  named in both widths, like the brand button already was. The account button had
  the same hole (`aria-label` was `null`, its only text hidden, `.avatar`
  `aria-hidden`), so it got `aria-label={t('nav.userMenu')}` too.
- **Popovers unreadable in the compact rail.** Both rail popovers open *outside*
  the 76px sidebar, and the rail's own `overflow: hidden` clipped them: the
  240px account menu rendered as a 68px strip («۹ رویدا», «۳ دوره» cut
  mid-word). The rail is now `overflow: visible` — safe because `.learner-nav`
  keeps its own `overflow-x/y: hidden`, which is where the scroll actually lived.
  Separately, `.mini-cart` anchored with `inset-inline-end: 0`, which in RTL pins
  the panel's *left* edge to the cart pill and pushed **203px of its 270px panel
  past the right of the viewport** (only 67px visible). It now matches
  `.user-dropdown` with `inset-inline-start: 0`, scoped to the desktop rail in
  [layout.css](apps/group/src/styles/layout.css): the mobile bar's pill sits left of
  centre, where the opposite direction is the only one that fits, so the global
  rule in [cart.css](apps/group/src/styles/cart.css) keeps its original anchoring.
- **Flush seat for the width control.** With the void gone the toggle still sat
  4px under «پیام‌ها», because `.top-nav`'s own flex `gap` applies to it as a
  direct child of the nav — a ribbon of dead space above a dashed control. The
  toggle carried `margin-top: calc(-1 * var(--space-1))`, cancelling exactly
  that gap and nothing more (link-to-link rows stay 4px apart), and measured
  last-link-bottom == toggle-top in both widths. **Superseded by UX-20**: the
  toggle left the nav for the shared `.rail-controls` parent at the rail's foot,
  so that negative margin is gone and the nav list now ends flush at «پیام‌ها».
  The gap chain above is the one measured while the toggle was still the nav's
  last row.
- **Cart icon 20px off the compact column.** `.cart-badge-btn` is `inline-flex`,
  so it shrink-wrapped to its 18px icon inside the 59px row and hugged the start
  edge; the shared `justify-content: center` had nothing to center inside. Every
  other row measured 0.5px off-centre, the basket measured 20px. The fix centers
  the *wrap* rather than widening the button: `.cart-badge-count` is positioned
  against `.cart-badge-btn`, so a full-width button stranded the count badge
  mid-row, 34px from the basket icon (measured, then reverted). With the wrap
  centered the button stays 20px, the icon remeasures at 0.5px off-centre and the
  badge lands on the icon's inline-end corner.
- Unchanged by design: row heights stay 36px (chips) vs 48px (nav links) — a
  pill control is meant to read lighter than a destination row — and the mobile
  bar keeps its 58px layout (`user-chip` 62px, cart 44px, burger 40px; the two
  desktop-only controls hidden, no overflow).
- Verified live: 1280px light + dark (same surfaces, `rgb(30, 39, 57)` chips,
  active row tinted), compact 76px (every row centred within 0.5px, nothing
  clipped), 390px (bar intact), on `/home` and `/dashboard`.
- **Guard:** the caret rule, the chips' `aria-label`s, the four rail
  measurements (shared icon column, non-stretching nav list, flush width
  control, centred cart) and the popover anchoring are pinned in
  [TopBar.test.ts](apps/group/src/components/layout/TopBar.test.ts) (21 tests);
  reverting each fix in turn makes the matching test fail (verified).
- Gates: typecheck, lint, 282 tests (shared 46 · web 83 · api 153), build (353
  static pages) all green.

### AUTH-6 — phone-only public registration (implemented this session)

Product decision: **self-registration happens only through the mobile/OTP
flow** (`/education`: phone → OTP code → profile). Everything that allowed an
email+password sign-up is gone, end to end:

- **API:** `POST /auth/register` (controller), `AuthService.register()` and
  `dto/register.dto.ts` deleted → the endpoint answers **404**. No public path
  can create a password-holding learner account any more.
- **Web:** `apps/group/src/app/(auth)/register/page.tsx` is now a redirect to
  `/education` (old bookmarks/external links land on the phone flow instead of
  a 404); the login page's «ایجاد حساب» link points at `/education`;
  `AuthProvider.register`, `api.register` and `demoApi.register` removed;
  `/register` dropped from `robots.ts`.
- **Shared:** the now-dead `RegisterDto` type was removed from
  `@kia./shared`.
- **Staff provisioning is unchanged:** admins still create account holders with
  email+password through `POST /admin/users` (admin panel), which is how staff
  and test accounts are made.
- **Login, password reset and 2FA stay intact** for accounts that do have a
  password (staff, admin-created users).
- `scripts/smoke.sh` now asserts `POST /auth/register → 404` and provisions its
  password-bearing smoke account through the admin API (29 probes, all green).
- i18n `auth.register.*` strings were intentionally left in the dictionary: the
  2FA copy the login screen renders (`auth.login.twoFactor*`) currently lives in
  that same object, so deleting the whole block would break the login screen.
- Note: the phone flow still collects an email in its profile step — it is a
  contact/receipt field, not a credential.

- `scripts/smoke.sh` — one-shot production-build smoke: boots built api+web, probes
  health, public pages, auth gates (401s), SEO artifacts, a real OTP
  request→verify cycle, and the full password-reset/change flow; exits non-zero on failure.
- `docs/IMPLEMENTATION_STATUS.md` — this file.
- XSS hardening (layout.tsx): JSON-LD `__html` now neutralizes `<` (`\u003c`) so
  future dynamic structured data (e.g. Course schema with admin-entered titles)
  can never break out of the `<script>` tag.
- FE-2 from `AUDIT.md` verified safe: `markdownToHtml` escapes all input before tag
  emission (`escapeHtml` covers `& < > " '`), link `href`s restricted to
  `https?://` or site-relative; no raw HTML passthrough.

### DB-2/DB-3/DB-4 — schema typing + soft delete (implemented this session)

- **DB-2:** `UserStatus` / `OrderSource` / `EntitlementResourceType` Postgres enums
  replace the last stringly-typed state columns (migration `20260906140000`
  remaps existing rows first). Fixed a latent grant→check mismatch: the admin
  entitlement form wrote `readiness_test`/`roadmap_bundle`, which learner checks
  (`roadmap:`/`readiness:` keys) never matched — the grant API now normalizes to
  the canonical enum vocabulary and the admin UI offers canonical values.
- **DB-3:** all 14 text-JSON columns → `jsonb` (Prisma `Json`); ~40
  JSON.parse/stringify round-trips removed across readiness, payments,
  roadmaps, course-exams, test-banks, personality, assessments, site-settings,
  challenges, admin, and seed.
- **DB-4:** `User.deletedAt` soft delete; `Order→User`, `Payment→User`,
  `Invoice→Order` FKs now `ON DELETE RESTRICT` so financial records cannot
  vanish via cascade; SUPER_ADMIN-only soft-delete (PII-anonymizing, forces
  logout, audited, identity-hash correlation for historical rows) + restore
  endpoints with unit tests. Soft-deleted users are hidden from admin lists
  and fully locked out of authentication.

### AUTH-5 — admin TOTP two-factor authentication (implemented this session)

- **Core (in-repo, dependency-free):** RFC 6238 TOTP (SHA-1, 6 digits, 30s step,
  ±1 step drift, constant-time compare) + RFC 4648 base32 (with padding) —
  verified against all six RFC test vectors. Secret encrypted at rest with
  AES-256-GCM (key derived from JWT_REFRESH_SECRET; no new required env).
  Only dependency added: `qrcode` for the enrollment QR data URL.
- **Enrollment (staff-only):** `POST /auth/2fa/setup` (QR + otpauth URL + secret,
  shown once), `POST /auth/2fa/confirm` (first-code verification → enabled +
  8 single-use recovery codes shown exactly once), `GET /auth/2fa/status`,
  `POST /auth/2fa/recovery-codes` (step-up protected), `DELETE /auth/2fa`
  (code-gated; wipes secret + codes).
- **Login integration:** 2FA-enabled staff get **no session** from
  `POST /auth/login` — a discriminated `twoFactorRequired` response carrying a
  2-minute, audience/purpose-scoped challenge JWT. `POST /auth/2fa/verify`
  (throttled 5/min) consumes TOTP **or** a recovery code (atomic single-use
  claim; TOTP steps replay-protected) and mints the real session. Suspended
  accounts are refused at both steps.
- **Admin overrides:** `GET/DELETE /admin/staff-2fa[/:userId]` — SUPER_ADMIN
  break-glass disable, audit-logged (`user.2fa.disable`); learners can never
  enroll.
- **Web:** `/admin/security` page (QR enrollment, recovery-code display, disable,
  staff table), login 2FA step with one-time-code input, full fa/en strings,
  demo-mode stubs.
- **Tests:** 34 new (RFC vectors, base32 round-trips, encryption tamper tests,
  enrollment flow, gating, replay protection, recovery-code burn, override
  permissions). Runtime smoke probes the full lifecycle against the built apps
  (28/28 PASS).

### ADM-2 — IDOR sweep (completed this session)

All 25 controllers inventoried; every object-level (`:id`/`:slug`) learner route
audited for ownership scoping; admin routes audited for privilege escalation.

**Verified clean (scoped correctly):** orders + invoices (×3 routes), payment
status, cart items, todos, tickets + replies, learner messages, readiness exam
attempts (`requireInProgress` userId-scoped), course-exam attempts
(`assertOwnAttempt`), course exams (enrollment-gated), roadmaps, assessments,
challenge submissions (`where { id, userId }`), competitions, media (signed
lesson-video JWT binds user+lesson+filename, path traversal via `resolveUnderRoot`),
public test banks (grading keys stripped), invoice HTML (owner-checked).

**Admin escalation paths verified:** role change and access matrix are
SUPER_ADMIN-only, last-super-admin demotion blocked, suspended/banned targets
protected, section-level `@AdminAccess('users','edit')` gating on top of RBAC.

**Gap found & fixed (payments, money path):**
unauthenticated gateway callbacks previously needed an `authority` (gatewayRef)
proof only on the FAILURE path — a forged `status=OK` with just a payment id
would complete a dev/sandbox provider payment (dev verify always succeeds
outside production). The gate is now **fail-closed for all unauthenticated
callbacks** (success and failure); authenticated callbacks remain
ownership-checked + server-side provider-verified. GET callback also gained
IDPay `id`/`order_id` query mapping so real IDPay browser redirects still pass.
3 new regression tests (no-authority success, mismatched authority,
provider-verify-never-reached assertion).

### AUTH-4 — password reset & change-password (implemented this session)

- **Data:** `PasswordResetToken` model + migration — SHA-256 digest only (raw token
  lives solely in the emailed link), `usedAt` single-use marker, 30-min expiry,
  cascade FK, lookup indexes.
- **API:** `POST /api/auth/forgot-password` (rate-limited 3/min; uniform success
  response — unknown/malformed/capped emails are indistinguishable; per-account
  email-bomb cap of 3/10min, enforced silently; older tokens invalidated),
  `POST /api/auth/reset-password` (shape-check before DB lookup, atomic
  single-use claim inside a transaction, bcrypt(12) re-hash, **all** refresh
  tokens revoked, suspended/banned accounts refused), `POST /api/auth/change-password`
  (JWT-guarded, current-password verified, new≠current enforced, revokes other
  devices only — current session survives; OTP-only accounts get a clear
  "set a password first" error).
- **Email:** `sendPasswordReset` Persian-first template (RTL, bilingual fallback,
  escaped link, no token in logs) + `send()` now returns sent/skipped/failed so the
  dev-only fallback (link logged outside production when SMTP is missing) is precise.
- **Web:** `/forgot-password` (enumeration-safe success state),
  `/reset-password?token=…` (client shape check, invalid-link and success states),
  change-password card on `/dashboard/profile`, forgot link on the login page;
  full fa/en i18n; demo-mode mirrors for all three calls.
- **Tests:** 18 new unit tests (`auth.service.password.spec.ts`) covering
  enumeration protection, email cap, hashed-at-rest tokens, expiry/used-token
  rejection, suspension refusal, atomic replay race (loser changes nothing),
  session-revocation semantics, and the no-log-in-production guarantee. Runtime
  verified end-to-end by `scripts/smoke.sh` (register → forgot → reset from
  logged link → old-password 401 → new login → wrong-current 401 → change →
  final login).

## Course discount codes (2026-10-21)

Learner-facing coupons for courses, manageable from the admin panel.

- **Data**: `DiscountCode` (PERCENT 1–100 or FIXED IRR amount, optional
  `startsAt`/`expiresAt`, `maxUses` + `usageCount`, `minSubtotalCents`,
  `courseSlugs` scope; `code` unique, stored uppercase) and `DiscountCodeUsage`
  (one audit row per redemption). Migration `20261020120000_discount_codes`.
  `Cart.discountCode` stores the coupon the learner applied.
- **Engine**: `apps/api/src/group/commerce/discounts` — validate + amount math
  comes from the pure helpers in `packages/shared/src/utils/discount.ts`, so the
  API, demo mode and tests share one implementation. A FIXED code is clamped to
  the eligible subtotal (never negative totals). Discounts apply to COURSE lines
  only; roadmap bundles are excluded.
- **Learner API**: `POST /api/cart/discount` (validates against the live cart,
  stores the normalized code) and `DELETE /api/cart/discount`. Cart responses
  carry `discountCode: { code, type, value, amountCents }`; a stale
  (expired/deleted/disabled) code silently drops out and is cleared. Checkout
  re-validates authoritatively, records the coupon on the order
  (`Order.metadata.discountCode`) and consumes one redemption.
- **Admin API**: `GET/POST /api/admin/discounts`, `PATCH|DELETE
  /api/admin/discounts/:id`, gated by the new `discounts` admin-access section
  (view/manage) and fully audited (`discount.create|update|delete`).
  `PATCH` accepts `null` to clear limits (`maxUses`, `minSubtotalCents`,
  `courseSlugs`, dates) and validates the *merged* rule.
- **UI**: `/admin/discounts` (table + create/edit form: type, value in the
  site's display currency, validity window, usage cap, minimum cart, course
  scope); cart page coupon box with localized failure reasons; checkout shows
  the applied code and amount. Demo mode mirrors the whole flow.
- **Verified**: `pnpm typecheck`, `pnpm lint`, `pnpm test` (all suites) plus a
  live end-to-end pass — admin create/update/delete, learner apply/reject
  (`NOT_FOUND`, `NOT_APPLICABLE`), totals `1,490,000 → −298,000 → 1,192,000`,
  checkout order persisted with `discountCents=298000` and the code in metadata,
  and usage counted once. Redemptions are reserved at order creation (an
  abandoned pending order consumes a use).

## Admin service extraction (2026-10-21)

`AdminService` (formerly a 2,453-line god-service owning all 55 admin
endpoints) is now a thin facade that delegates to one service per department:

| Service | Department / scope |
| --- | --- |
| `admin-stats.service.ts` | platform dashboard counters |
| `admin-users.service.ts` | accounts, roles, moderator panel access |
| `admin-academy.service.ts` | courses, lessons, lesson media |
| `admin-events.service.ts` | challenges and competitions |
| `admin-support.service.ts` | tickets, learner inbox, contact form |
| `admin-commerce.service.ts` | payments, orders, entitlements, wallets, refunds |
| `admin-discounts.service.ts` | course discount codes |

`AdminRequestMeta` moved to `admin-types.ts` (still re-exported from
`admin.service.ts`) so the extracted services never import the facade.
The department services are plain classes instantiated in the facade's
constructor, so the Nest wiring **and** the existing `admin.service.spec.ts`
(which builds `new AdminService(prisma, media, settings, audit, payments)`)
are untouched and still exercise the real extracted logic. New callers should
inject the department service directly.

Verified: `pnpm --filter api typecheck|lint|test` (126/126, spec untouched),
then a live A/B pass — all 14 admin read endpoints return byte-identical
payloads (volatile timestamps stripped) before vs after, and a create/duplicate-409/delete
round-trip through the events and discounts services still audits
`challenge.create`, `discount.create` and `discount.delete`.

## Audit backlog (remaining, by priority)

### Dependency audit closure (implemented 2026-09-29)

- **All 17 audit findings resolved** (10 high / 6 moderate / 1 low) via
  `pnpm-workspace.yaml` overrides: `mysql2 >=3.22.0` (prisma CLI dep, unused — the
  app connects through `@prisma/adapter-pg`), `multer >=2.4.0`, `nodemailer >=9.1.1`,
  `qs >=6.15.4`, `fast-uri >=4.1.4`, `sharp 0.35.5`.
- **CI-1 flip:** the `security.yml` dependency-audit job is now **blocking**
  (`continue-on-error` removed) at `--audit-level=high` — a new high+ advisory
  fails CI until triaged, closing the last "known deferred" pre-launch item.
- Backlog docs reconciled against the code: CHAL-3 (challenge FK on submissions),
  DB-1 (wallet CHECK constraint + transactional ledger), PAY-5 (accepted —
  single-winner claim + webhook idempotency suffice for single-instance),
  FE-1 (accepted — sessionStorage scoping is a deliberate XSS blast-radius
  trade-off; refresh token already HttpOnly).

### EXAM-3 — exam question snapshots (implemented 2026-09-26)

- **Migration `20260926120000_exam_question_snapshots`:** nullable
  `CourseExamAttempt.questionSnapshot` and `ReadinessAttempt.questionSnapshot`
  jsonb columns (18 migrations total).
- **Pin at start:** starting an exam writes the full question payload (course
  exam) or the resolved bank questions (readiness) onto the attempt.
- **Serve + grade from the snapshot:** resume and submit paths read the pinned
  questions — admin edits to a live exam/bank can no longer change what a
  learner sees or how an in-flight attempt is graded.
- **Legacy fallback:** attempts with a null snapshot (pre-migration rows) keep
  resolving against the live payload/bank.
- **Tests:** 7 new specs (pinning, snapshot-served resume, snapshot-based
  grading after live edits, legacy fallback) across both services — suite now
  132 api / 209 total.

Also this session: verified **PAY-3b** (`POST /admin/payments/:id/refund`),
**CI-1** (`security.yml`: pnpm audit + gitleaks + CodeQL, SHA-pinned) and
**CI-2** (Redis-backed `RateLimitStorageProvider`, fail-open) were already
implemented — the backlog docs were stale; both docs refreshed. Lint warning
(`statusUpper`) fixed; production build + runtime smoke re-run end-to-end
(all probes PASS, API `/api/health` reports `database: up`).

### ADM-1 — server-issued admin access (implemented this session)

- **One resolver, shared everywhere:** `resolveStaffAdminAccess` in
  `packages/shared` — per-user override → custom role matrix → site template.
  The API's `buildAuthUser` (login/2FA/OTP/me payloads) and
  `ModeratorAccessService` (guard enforcement) both call it, so issuance and
  enforcement can never drift.
- **Custom-role gap fixed:** a custom role without its own matrix previously
  fell back to the client's default template instead of the site template —
  now resolved server-side exactly like ADMIN.
- **Client consumes, never derives:** `useAdminAccess` reads
  `user.adminPanelAccess` verbatim (SUPER_ADMIN gets no field = full access);
  removed `createDefaultSiteSettings` fallback and all local matrix logic.
- **Custom roles can reach the panel:** staff gates unified on shared
  `isStaffRole` (admin shell, login redirect, `resolvePostLoginPath`, TopBar
  entry point, 2FA page).
- **Users page seeds the editor from server values:** draft matrix = user
  override → role matrix → template, mirroring backend order.
- **Demo mode:** added a moderator persona (`moderator@kia.academy`) whose
  matrix is explicitly issued by the demo API — the UI still derives nothing.
- **Tests:** 5 shared resolver specs + 4 API issuance specs + 1 post-login
  custom-role spec — suite now 136 api / 219 total (was 132/209).

| ID | Sev | Item |
| --- | --- | --- |
| ~~EXAM-4~~ | P1 | **RESOLVED** — `CourseExam.maxAttempts` (default 3, admin-tunable 1–10); only SUBMITTED attempts consume budget; EXPIRED terminal |
| ~~ADM-1~~ | P1 | **RESOLVED** — frontend consumes only server-issued access via unified `resolveStaffAdminAccess` (see AUDIT.md) |
| ~~CHAL-3~~ | P1 | **RESOLVED** — submissions resolve + FK-enforce the `Challenge` row server-side and pin its version |
| ~~AUTH-6~~ | P2 | **RESOLVED, then superseded** — main hardened email register (enumeration-safe 409 + timing equalizer); on 2026-10-03 public email registration was removed entirely (phone/OTP-only), making the endpoint — and its hardening — moot. The `type=verify` reset-link semantics remain for profile email changes |
| ~~PAY-5~~ | P2 | **ACCEPTED** — single-winner completion claim + `PaymentWebhookEvent` idempotency cover exactly-once for single-instance; outbox only pays off with multi-writer fan-out |
| ~~ADM-3~~ | P2 | **RESOLVED** — full audit coverage; last gap (`contact.read`) closed |
| ~~FE-2~~ | P2 | **RESOLVED** — sanitize audit complete; escape-first renderer pinned by tag-vocabulary + injection tests |
| ~~FE-1~~ | P2 | **ACCEPTED** — access token in `sessionStorage` is a deliberate per-tab XSS blast-radius trade-off; refresh token already HttpOnly |
| ~~DB-1~~ | P2 | **RESOLVED** — `balanceCents` non-negative CHECK constraint; all mutations transactional with ledger rows |
| CHAL-2 sandbox | P2 | Scoring is heuristic/static (no server-side execution) — sandbox model when dynamic scoring is needed |

Closed this session: EXAM-4 (attempt caps), AUTH-6 (enumeration-safe register
+ email verification), ADM-3 (contact.read audit gap), FE-2 (sanitize audit
pinned by tests), CHAL-3 (challenge FK on submissions), DB-1 ledger invariant
(CHECK constraint + transactional ledger — verified pre-existing), CI-1 flip
(audit now blocking), dependency-audit closure (17→0 via overrides).
Accepted with rationale: PAY-5 (outbox — not warranted single-instance),
FE-1 (sessionStorage — deliberate trade-off). Previously closed: EXAM-3
(question snapshots), PAY-3b (admin refund), CI-1 (security.yml), CI-2
(Redis throttler storage), ADM-2 (IDOR sweep), DB-2/3/4.

### EXAM-4 / AUTH-6 / ADM-3 / FE-2 — backlog closure (implemented this session)

- **EXAM-4:** `CourseExam.maxAttempts` (migration `20260928100000`, default 3,
  DTO clamp 1–10, exposed on AdminCourseExam/CourseExamSummary). `startAttempt`
  counts only SUBMITTED attempts against the cap (403 `Attempt limit reached
  (n/m)` when exhausted); EXPIRED attempts became terminal — the previous
  resume-expired quirk let a learner restart an expired try forever; 5 specs.
- **AUTH-6:** `register` now catches the P2002 unique violation and returns a
  generic 409 — no `Email already registered` message, no session. A module-
  level `DUMMY_HASH` (bcrypt 12) absorbs the timing side-channel; a silent
  verification link is emailed to the true owner. Email verification reuses
  the AUTH-4 token infra (`ResetPasswordDto.type=verify` flips
  `emailVerified`), `completeProfile` email changes reset `emailVerified` and
  resolve conflicts via P2002 instead of a revealing findUnique; 8 specs.
  *(Superseded 2026-10-03: the whole email `register` endpoint was removed in
  favor of phone-only registration — see the merge note at the top; the
  `type=verify` token semantics survive for profile email changes.)*
- **ADM-3:** coverage sweep of all 33 admin mutation routes vs 31 audit
  entries — the single gap (`contact.read`) now records actor/target/
  before/after with request meta.
- **FE-2:** the two `dangerouslySetInnerHTML` sinks audited (layout JSON-LD
  already `\u003c`-neutralizes; LessonPlayer renders `markdownToHtml`). New
  test suite pins the emitted tag vocabulary (14 tags) and asserts no
  script/iframe/object/embed/style/onerror injection survives any block type,
  no `javascript:`/`data:` hrefs, and no attribute breakout.
- **CI additions:** `e2e.yml` (Playwright against production build + real
  Postgres, report artifact on failure, `E2E_PRODUCTION` webServer mode) and
  `docker-publish.yml` (GHCR publish of api/web images on main pushes and
  v* tags, SHA-pinned actions, GHA build cache).

## Environment notes (dev)

- `.env.docker` was missing JWT secrets in this worktree → generated locally via
  `crypto.randomBytes(48)` (git-ignored; never committed).
- Docker compose interpolation reads the **root** `.env`, not `.env.docker`
  (the latter is only a runtime `env_file` for the api container).
- Long-lived dev servers cannot persist between tool calls in this workspace;
  use `scripts/smoke.sh` for runtime verification.
- Known cosmetic quirk (pre-existing): API logs `running on http://localhost:0/api`
  in `pnpm dev` because `PORT` is unset in dev `.env`; prod/compose set it explicitly.

## Admin panel — reachability and label gaps (2026-10-11)

Audit method: the admin surface was diffed mechanically — every `/admin/…` path
called from `apps/group/src/lib/api.ts` was matched against the routes the API's
`@Controller`s declare, and the `@AdminAccess(section, level)` decorating each
route was read from the handler itself (this controller writes the route first,
the permission second — reading the other side reports the previous handler's
permission, which is how the first version of the new test passed by accident).

### ADM-4 — server capabilities the panel could not reach (implemented)

- **`POST /admin/payments/:id/refund` had no UI.** Full/partial refund with the
  `payments.manage` gate, the COMPLETED-only state machine, the wallet CREDIT in
  the same transaction and the audit entry all existed server-side but were
  unreachable. The payments table now has an actions column: a refund action on
  COMPLETED rows only, a confirmation dialog (amount entered in the display
  currency and converted with `fromDisplayUnits` — empty means full refund;
  reason mandatory), inline validation, and the row swapped to the state the
  server returns. `lib/demoApi.ts` mirrors the same state machine for demo mode.
- **`DELETE /admin/users/:id` + `POST /admin/users/:id/restore` had no UI and no
  reachable target.** `listUsers` hard-filtered `deletedAt = null`, so a
  soft-deleted account was invisible and therefore unrecoverable from the panel.
  `AdminUserListParams.deleted` (`active` default | `deleted` | `all`) now drives
  the filter server-side, `AdminUser.deleted` reports the flag, and the users
  page gained a deleted-view select, a delete action behind a reasoned dialog and
  a restore action — both gated on `users.manage` (the API still enforces it).
- Tests: `apps/api/src/group/admin/admin.service.spec.ts` +2 (default hides
  deleted; `deleted` = `{ not: null }`, `all` omits the filter; `deleted` flag on
  a soft-deleted row) and the new `apps/group/src/app/admin/adminActions.test.ts`
  — 11 tests covering refund wiring, route permission, delete/restore wiring,
  the deleted-view default and the ban on calling a client method that does not
  exist.

### ADM-5 — payment status labels leaked raw key paths (implemented)

- `PaymentStatus` has 7 members, `domain.payments` had 4 labels, and three admin
  pages render the status through a template key — so PROCESSING,
  CANCELLED and PARTIALLY_REFUNDED (which the refund flow itself produces)
  rendered as raw key paths. All 7 labels now exist in both locales, the English
  labels are no longer raw enum tokens, and the payments filter lists every
  member. The new test derives the member list from the shared type file, so
  adding a status without a label fails the suite.

**Verification (2026-10-11):** `apps/group` vitest 19 files / 169 tests pass;
`apps/api` jest 11 suites / 126 tests pass; `tsc --noEmit` clean in both apps;
ESLint clean on every touched file. Live check against the dev server with a
super-admin session: the seven statuses render as Persian labels, the refund
action appears on a COMPLETED row and `—` on the others, the dialog opens with
the currency-correct unit (ریال here), and both client validations fire — missing
reason («ثبت دلیل برای حسابرسی الزامی است.») and amount above the total («مبلغ
باید بین ۱ و کل مبلغ پرداخت باشد.») — without calling the API. The deleted view
sends `deleted=deleted` (200) and returns an empty list because nothing is
soft-deleted in dev; switching back to «حساب‌های فعال» restores the 4 rows. The
one payment temporarily flipped to COMPLETED for that check was returned to
PENDING (table is back to 3 × PENDING).

**Still open from this pass:** `GET /admin/exams` (academy package) has no
consumer in the panel — wire it into the exams overview or delete it; the deleted
view has no bulk-restore affordance; and the users page still renders a
row-level success marker rather than a shared notification.
