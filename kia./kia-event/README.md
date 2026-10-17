# @kia./kia-event — KIA Event

**کیا. — دپارتمان رویداد** — این پکیج مثل یک **پروژهٔ جدا** توسعه می‌یابد و فقط به
هستهٔ مشترک (`@kia./platform` + `@kia./shared`) وابسته است.

## نقشهٔ پوشه‌ها → ماژول‌های موجود

| پوشه | ماژول‌های Nest | توضیح |
| --- | --- | --- |
| `competitions/` | `competitions/`، `challenges/` | مسابقات و چالش‌ها (کل دامنهٔ KIA Event) |
| `bootcamps/` | `bootcamp/` | بوت‌کمپ‌ها — ماژول `bootcamp` از آکادمی به اینجا منتقل شد (بدون وابستگی داخلی به آکادمی) |
| `events/` | — (فقط README) | تقویم رویدادهای عمومی (پیاده‌سازی نشده) |
| `webinars/` | — (فقط README) | وبینارها (پیاده‌سازی نشده) |
| `workshops/` | — (فقط README) | ورکشاپ‌ها (پیاده‌سازی نشده) |

## قواعد معماری

- **ممنوع** است از/به دپارتمان دیگری import شود (توسط ESLint مسدود است).
- نقطهٔ اتصال: `apps/api/src/app.module.ts` ماژول‌های این پکیج را ثبت می‌کند؛
  مسیرهای وب (`/events`، `/dashboard/bootcamps`، ...) در `apps/group` می‌مانند (URLها فریز شده).
- نام route کنترلرها تغییری نکرده — رفتار API دقیقاً مثل قبل است.

## دستورات

```bash
pnpm --filter @kia./kia-event build      # tsc → dist/
pnpm --filter @kia./kia-event typecheck
pnpm --filter @kia./kia-event test       # jest (۲ spec)
pnpm --filter @kia./kia-event lint
```
