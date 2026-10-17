# Kia Academy rebuild — architecture (Step 0)

Kia Academy is being rebuilt as **کیا آکادمی (Kia Academy)**: a Persian-first learning platform for Iran.

## Product shape

| Path | Audience | Auth |
| --- | --- | --- |
| `/` | Everyone | Public landing (header + short copy + 2 CTAs) |
| `/material` | Everyone | Public Material Studio (ported from Kia uploads) |
| `/education` → phone → OTP → profile → start | Learners | Iranian phone OTP |
| `/assessment` | Learners with complete profile | JWT session |
| `/learn/...` | Enrolled learners | JWT; Kia-style lesson UI + video |
| `/dashboard` | Learners with roadmap | JWT; 9-section learner panel (wallet, progress, courses, tickets, …) |
| `/dashboard/*` | Learners | JWT; finance, todos, tickets, messages, profile detail pages |

## Technical decisions

1. **Default locale:** `fa` (RTL). Other locales remain available but Persian is primary.
2. **Material Studio:** Client-only feature under `kia./kia-material/resources/`. UI preserved; code split into data / utils / state / panels for maintainability. No Nest dependency.
3. **Education auth:** Phone-first OTP (Iranian `09xxxxxxxxx` / `+989…`). Email+password kept for admin/seed compatibility.
4. **Profile gate:** After OTP, required profile (`firstName`, `lastName`, `city`, `email`); phone read-only. Optional `bio` + avatar upload on dashboard/profile. XSS/spam sanitization on text fields.
5. **OTP delivery:** Configure Kavenegar (or another SMS provider) under Admin → OTP/SMS. In development, OTP is logged and returned in API response when `OTP_DEV_EXPOSE=true` (default in development) if SMS is disabled or using the `dev` provider.
6. **Payments:** IRR/Toman display; Stripe optional/legacy. Checkout amounts stored as IRR (integer rials). Gateway can be mocked until a real Iran PSP is wired. Learner wallet (`LearnerWallet` + `WalletTransaction`) backs the dashboard financial card; balance is prepaid credit, with payment history merged into the transaction list.
7. **Lessons:** Kia Learn-inspired layout + HTML5 video with controls and fullscreen; keep Nest course/lesson APIs.
8. **Learner dashboard:** `/dashboard` is a single-scroll overview matching the Panel UI redesign; deeper CRUD stays on `/dashboard/*` routes. Todos remain server-backed (`LearnerTodo`), not localStorage.

## Validation rules

- **Phone:** normalize to `09xxxxxxxxx`; accept `+98`, `98`, `0` prefixes.
- **OTP:** 6 digits; TTL 5 minutes; max attempts enforced server-side.
- **Email:** standard format; reject HTML/script-like payloads.
- **Name/city:** letters, spaces, Persian letters; reject URLs, `<script>`, control chars; length caps.
