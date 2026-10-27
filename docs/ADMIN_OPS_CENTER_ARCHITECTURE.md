# Kia Admin Ops Center — Architecture (from-scratch redesign)

## Principles

1. **Platform vs Department** — shared ops live in platform chrome; department tools only appear inside that department workspace.
2. **No fake actions** — empty departments show honest empty shells until Prisma + guarded APIs exist.
3. **Permissions from server** — UI consumes `AuthUser.adminPanelAccess`; Backend `AdminAccessGuard` remains source of truth.
4. **Stable HTTP contracts** — `/api/admin/*` paths unchanged; redesign is shell + presentation + information architecture.
5. **Persian / RTL first** — all chrome copy is Persian; technical IDs stay LTR.

## Information architecture

```text
مرکز کنترل (/admin)
دپارتمان‌ها (/admin/departments)

عمومی
  کاربران · نقش‌ها · پشتیبانی · پیام‌ها · تماس‌ها
  مالی · سفارش‌ها · پرداخت‌ها · کیف‌پول · تخفیف‌ها · دسترسی‌ها
  گزارش‌ها · حسابرسی · تنظیمات · امنیت

دپارتمان‌ها (workspace)
  آکادمی → دوره‌ها، آزمون‌ها، …
  ایونت → رقابت‌ها، چالش‌ها، …
  کار / متریال / کامیونیتی / لب → شِل صادقانه تا API آماده شود

سیستم
  تنظیمات · امنیت · سلامت (از نمای کلی)
```

## Shell modules

| Module | Path |
| --- | --- |
| Nav registry | `apps/group/src/lib/adminNav.ts` |
| Shell | `apps/group/src/app/admin/AdminLayoutClient.tsx` |
| Theme | `apps/group/src/styles/admin-ops-center.css` |
| Dashboard | `apps/group/src/app/admin/page.tsx` |
| Dept hub | `apps/group/src/app/admin/departments/page.tsx` |

## Department context

Entering `/admin/{slug}` activates `is-workspace--{slug}`, paints chrome from `--dept-{slug}`, and swaps sidebar to that department’s tools only.

## Compatibility

Existing CRUD pages under `/admin/**` keep their data fetching via `lib/api.ts`. Legacy redirects for `/admin/courses` remain.
