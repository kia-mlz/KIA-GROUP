# kia. — Testing Strategy

## Layers

| Layer | Runner | Location | Focus |
| --- | --- | --- | --- |
| Package units | Vitest | `packages/brand`, `packages/permissions`, `packages/shared` | tokens, ink contrast, permission resolution, grading, currency |
| API units | Jest | `apps/api/src/**/*.spec.ts` | services, guards, utils, event bus, search registry, security paths |
| Web units | Vitest | `apps/group/src/**/*.test.ts(x)` | brand/stylesheet cross-checks, registries, markdown safety, i18n |
| E2E | Playwright | `apps/group/e2e/` | critical user journeys against a running stack |

## What is prioritized (not coverage %)

1. **Authentication** — password hashing, OTP flood caps, reset/verify token
   lifecycles, 2FA (RFC test vectors), session revocation (auth specs ×4).
2. **Authorization** — access-matrix resolution, guard behaviour, IDOR-swept
   ownership rules.
3. **Money** — payment state machine, webhook idempotency, wallet ledger
   invariants.
4. **Brand integrity** — the seven colours are pinned on *both* sides
   (`packages/brand` + the web suite reads `packages/brand/css/brands.css`), so
   a department colour cannot drift or borrow the parent gold.
5. **Cross-domain machinery** — event-bus delivery/isolation, search
   fan-out/caps/provider-failure isolation.

## Running

```bash
pnpm test          # everything (builds libs first)
pnpm --filter @kia./api test          # API only
pnpm --filter @kia./group test        # web only
pnpm test:e2e      # Playwright (needs the stack running; see ci.yml for the recipe)
```

## Conventions

- Specs live next to the code (`*.spec.ts` in the API, `*.test.ts` on the web).
- No network in unit tests; Redis-dependent specs cover the fail-open path.
- Security-relevant behaviour gets an explicit test name describing the attack
  (e.g. "rejects expired tokens", "blocks the 4th code for the same phone").

## Known untested areas (documented debt)

- Media streaming behind signed URLs (integration-level; requires object
  storage or full Postgres stack).
- Stripe/Zarinpal/IDPay live-gateway verify paths (sandbox-only coverage;
  providers are behind the `PaymentProviderRegistry`).
- E2E for `/work`, `/labs`, `/community` — they are hub/coming-soon pages.
