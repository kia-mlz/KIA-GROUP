# Admin Site Settings Catalog

Complete inventory of everything controllable from the Kia admin panel.
Every listed item is implemented with a **full kit** (create + read + update + delete / add + remove where applicable). No one-sided controls.

---

## 1. General site

| Setting | Type | Kit |
|---------|------|-----|
| Site name | string | edit |
| Tagline | string | edit |
| Hero assessment minutes | number | edit |
| Hero roadmaps count | number | edit |
| Hero match percent | number | edit |
| Support email | string | edit |

---

## 2. Pricing

| Setting | Type | Kit |
|---------|------|-----|
| Readiness test price (cents) | number | edit |
| Individual course price (cents) | number | edit |
| Module prices (dollars array) | number[] | **add / edit / remove** slots |
| Roadmap bundle discount (%) | number | edit |

---

## 3. Learning tracks

| Setting | Type | Kit |
|---------|------|-----|
| Track (key, name, icon, description) | object | **add / edit / remove** |
| Modules inside a track | string[] | **add / edit / remove / reorder** |

Tracks drive assessment interests and roadmap generation.

---

## 4. Readiness rules

| Setting | Type | Kit |
|---------|------|-----|
| Pass threshold (%) | number | edit |
| Pass verdict title | string | edit |
| Pass verdict message | string | edit |
| Fail verdict title | string | edit |
| Fail verdict message | string | edit |

---

## 5. Bootcamp rules

| Setting | Type | Kit |
|---------|------|-----|
| Unlock score threshold (%) | number | edit |
| Unlock course slug | string | edit |
| New-user default rank | number | edit |
| New-user default points | number | edit |

---

## 6. Courses (catalog)

| Entity | Kit |
|--------|-----|
| Course | **create / list / edit / delete** (slug, title, description, icon, track, sort order, published) |
| Lesson | **create / list / edit / delete** (slug, title, content, duration, sort order) |
| Lesson video | **upload / replace / remove** (mp4, webm, ogg, mov; max 200 MB) |

---

## 7. Challenges

| Entity | Kit |
|--------|-----|
| Challenge | **create / list / edit / delete** (slug, title, description, points, dates, active, starter code) |

---

## 8. Users

| Setting | Kit |
|---------|-----|
| Role (LEARNER ↔ ADMIN) | list + update |

---

## Already present (stats only)

- Platform stats dashboard (users, courses, lessons, enrollments, payments, revenue, challenges)

## Out of scope (not CMS-managed)

- Full multi-locale marketing/legal copy (still i18n files)
- Payment records / refunds UI
- Assessment / roadmap / enrollment browsers
- SMTP / Stripe secrets (env vars)
