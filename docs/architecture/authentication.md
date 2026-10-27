# Kia — Authentication

One identity spans all seven brands. A user registers once (phone OTP) and is
the same `User` row across Academy, Work, Material, Labs, Events and Community.

## Flows

| Flow | Entry | Notes |
| --- | --- | --- |
| **Phone OTP (primary, learners)** | `POST /api/auth/otp/request` → `POST /api/auth/otp/verify` | Iranian numbers normalized to `09xxxxxxxxx`; 6-digit code, SHA-256 hashed, 5-min TTL, max attempts, per-phone flood caps. Non-production `OTP_DEV_EXPOSE=true` returns `devCode`. |
| **Profile completion** | `POST /api/auth/profile` | First profile completion emits `group.user.profile_completed`; email conflicts resolve through P2002 with a generic error (AUTH-6 anti-enumeration). |
| **Email + password (staff & seeded users)** | `POST /api/auth/login` | bcrypt cost 12; timing-equalized failure paths. |
| **2FA (staff, TOTP)** | login returns a 2-min single-purpose challenge → `POST /api/auth/2fa/verify` | RFC 6238, AES-256-GCM encrypted secret, 8 single-use bcrypt-hashed recovery codes, replay watermark (AUTH-5). |
| **Password recovery** | `POST /api/auth/forgot-password` → `POST /api/auth/reset-password` | Uniform responses, hashed single-use 30-min tokens, atomic claim, full session revocation (AUTH-4). |
| **Token refresh** | `POST /api/auth/refresh` | Refresh token stored as SHA-256 digest, rotated by delete-claim, HttpOnly SameSite cookie. |

## Session model

- **Access token:** short-lived JWT (default 15 min) held in `sessionStorage`
  (per-tab XSS blast-radius trade-off, documented in `docs/AUDIT.md` FE-1).
- **Refresh token:** 7-day, HttpOnly cookie, revocable server-side
  (`RefreshToken` rows); role changes and suspensions revoke immediately
  (AUTH-1/2/3).
- **Status gate:** every validate path rejects `SUSPENDED`/`BANNED`/soft-deleted
  users, not just login.

## Where the code lives

- `apps/api/src/group/auth/` — the whole auth domain (controller, service,
  strategies, 2FA). It is a **group/platform** module: identity belongs to KIA
  GROUP, not to any department.
- Role model: `@kia./permissions` (re-exported by `@kia./shared`).
- The web client: `apps/group/src/context/AuthProvider.tsx` and the `(auth)`
  route group.

## Validation rules

- **Phone:** normalize `+98`/`98`/`0` prefixes and Persian/Arabic digits to
  `09xxxxxxxxx`.
- **Email:** strict structural validation; HTML/script/URL payloads rejected
  (`containsUnsafeText`).
- **Names/city:** length-capped, control-char-stripped (`sanitizeProfileText`).
