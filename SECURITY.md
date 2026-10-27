# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `main` (latest) | Yes — security fixes land here |
| Older commits / forks | No — please upgrade to latest `main` |

## Reporting a vulnerability

Please report security issues **privately** — do not open a public GitHub issue for exploitable bugs.

1. Prefer GitHub **Security Advisories** / private vulnerability reporting on the repository:
   https://github.com/kia-mlz/KIA-GROUP/security/advisories/new
2. Or email the maintainer via the contact options listed on the repository profile / `CONTACT` if available.

Include:

- Affected component (`apps/api`, `apps/group`, Docker, etc.)
- Steps to reproduce (PoC welcome)
- Impact assessment (auth bypass, data exposure, RCE, etc.)
- Your preferred credit name (optional)

We aim to acknowledge reports within **7 days** and to share a remediation timeline after triage. Please give us a reasonable window before public disclosure.

## Production hardening checklist

Operators deploying Kia should:

- Set strong unique `JWT_SECRET` and `JWT_REFRESH_SECRET` (min 32 chars; never example placeholders)
- Set `NODE_ENV=production`
- Leave `OTP_DEV_EXPOSE` unset/false (OTP codes must never appear in API responses in production)
- Configure a real SMS provider (`kavenegar`) under **Admin → OTP/SMS** — `dev` SMS and local code exposure are disabled in production
- Configure a real payment gateway (`zarinpal` / `idpay` / `stripe`) — `dev` and simulator paths are disabled in production
- Configure Enamad id/code under **Admin → Enamad** when the trust seal is required
- Set `CORS_ORIGIN` and `APP_URL` / `NEXT_PUBLIC_APP_URL` to the public HTTPS origins
- Set `TRUST_PROXY=true` behind nginx, Cloudflare, Railway, etc.
- Keep `SEED_DATABASE=false` (seed accounts use well-known demo passwords)
- Do not expose PostgreSQL to the public internet; bind to localhost or a private network only
- Rotate any credentials that were ever committed to `.env.example` style placeholders in real deployments
- Never commit live Kavenegar API keys, payment merchant ids, or Enamad panel credentials to git
