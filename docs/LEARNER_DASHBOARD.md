# Learner dashboard

The learner panel is the authenticated home for Kia students.

## Overview (`/dashboard`)

After a learner owns a roadmap, `/dashboard` shows a single-page redesign with nine live cards:

1. **Wallet & transactions** — digital card balance (IRR stored, تومان shown) + recent ledger/payment rows
2. **Bootcamps & challenges** — rank/points and challenge status with countdown
3. **Overall progress** — doughnut %, course/exam/certificate counts, activity feed
4. **Latest exam results** — readiness history + module skill bars
5. **Daily todos** — create / toggle / delete (server `LearnerTodo` API)
6. **Courses & paths** — enrolled courses with progress
7. **Support tickets** — list + in-panel create modal (category + subject + body)
8. **Admin messages** — latest inbox preview
9. **Profile** — inline edit, bio, avatar upload

Empty / loading / error (+ retry) states are handled per card. Toast feedback covers ticket create and profile save.

Learners without a roadmap still see the assessment CTA empty state.

## Detail routes

| Route | Purpose |
| --- | --- |
| `/dashboard/finance` | Orders, invoices, retry payment |
| `/dashboard/purchases` | Purchased roadmaps / courses |
| `/dashboard/results` | Full exam history |
| `/dashboard/bootcamps` | Bootcamp arena entry |
| `/dashboard/competitions` | Registered competitions |
| `/dashboard/events` | Events hub |
| `/dashboard/progress` | Detailed progress bars |
| `/dashboard/todos` | Full todo list |
| `/dashboard/my-courses` | Course detail + attachments |
| `/dashboard/tickets` | Ticket list / thread / new |
| `/dashboard/messages` | Full admin inbox |
| `/dashboard/profile` | Profile form (includes bio) |

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
