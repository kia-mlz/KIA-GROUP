# Learner dashboard

Learners get **one panel per department**, plus a thin platform account surface
for wallet / support / profile. Menus switch with the active department (same
idea as the admin workspaces).

## Department panels

| Panel | Route | Contents |
| --- | --- | --- |
| **Kia Academy** | `/dashboard` (alias `/academy/panel`) | Progress, exam results, enrolled courses |
| **Kia Event** | `/events/panel` | Bootcamp card, enrolled bootcamps, competitions, rewards |
| **Kia Material** | `/material/panel` | Studio entry + coming collections |
| **Kia Work** | `/work/panel` | Honest empty shell → `/freelance` hub |
| **Kia Community** | `/community/panel` | Honest empty shell → `/community` hub |
| **Kia Lab** | `/labs/panel` | Honest empty shell → `/labs` hub |

Registry + path → menu ownership: `apps/group/src/lib/learnerPanels.ts`.

The sidebar (`LearnerNav`) shows that department’s tools, keeps tickets/messages
reachable from every department rail, and ends with a department-panel switcher
(plus `/home`).

## Academy overview (`/dashboard`)

After a learner owns a roadmap, `/dashboard` shows the Academy panel:

1. **Overall progress** — doughnut %, course/exam/certificate counts, activity feed
2. **Latest exam results** — readiness history + module skill bars
3. **Courses & paths** — enrolled courses with progress

Learners without a roadmap still see the assessment CTA empty state.

Wallet, bootcamps, todos, tickets, messages and profile were moved out of this
grid: bootcamps live under the Event panel; account/support under the platform
menu on `/dashboard/finance|tickets|messages|profile|todos|purchases`.

## Detail routes

| Route | Owner | Purpose |
| --- | --- | --- |
| `/dashboard/my-courses` | Academy | Course detail + attachments |
| `/dashboard/progress` | Academy | Detailed progress bars |
| `/dashboard/results` | Academy | Full exam history |
| `/dashboard/bootcamps` | Events | Bootcamp arena entry |
| `/dashboard/competitions` | Events | Registered competitions |
| `/dashboard/events` | Events | Events hub |
| `/dashboard/finance` | Platform | Orders, invoices, retry payment |
| `/dashboard/purchases` | Platform | Purchased roadmaps / courses |
| `/dashboard/todos` | Platform | Full todo list |
| `/dashboard/tickets` | Platform | Ticket list / thread / new |
| `/dashboard/messages` | Platform | Full admin inbox |
| `/dashboard/profile` | Platform | Profile form (includes bio) |

## APIs added/extended for the redesign

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/payments/wallet?limit=` | Ensures wallet row; returns balance + merged transactions |
| GET | `/api/payments/transactions?limit=` | Transaction list only |
| GET | `/api/progress` | Adds `overallPct`, counts, `activity` |
| GET | `/api/bootcamp/state` | Adds `challenges[]` with `active`/`open`/`ended` |
| PATCH | `/api/auth/profile` | Optional `bio` |
| POST | `/api/auth/profile/avatar` | Multipart field `avatar` → `/api/uploads/avatars/…` |
| POST | `/api/tickets` | Optional `category` |

Wallet seed for `alex@kia.academy` includes a 1,250,000 IRR balance and sample ledger rows.

## UI source

Visual/UX structure source of truth: `dashboard.zip`. Colour and visual language follow
`docs/design-system/MASTER.md` / `apps/group/src/styles/base.css` (periwinkle brand, mint
progress, amber value, ink neutrals). Dashboard-specific teal overrides are not used.
Department panels inherit `.dept--*` tokens on the rail and overview shells.
