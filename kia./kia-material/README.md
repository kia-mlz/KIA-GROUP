# @kia./kia-material — Kia Material

**کیا — دپارتمان متریال** — «Material Studio» اینجاست؛ مثل یک **پروژهٔ جدا** ولی
**منبعِ مستقیم** (بدون build): `apps/group` آن را با `transpilePackages` باندل می‌کند.

## نقشهٔ پوشه‌ها

| پوشه | محتوا |
| --- | --- |
| `resources/` | **Material Studio** — کد منتقل‌شده از `apps/group/src/features/material` (کنترلر، داده‌ها، lib، CSS) |
| `templates/` | — (فقط README) قالب‌های آمادهٔ طراحی |
| `assets/` | — (فقط README) دارایی‌های بصری |
| `tools/` | — (فقط README) ابزارهای کمکی استودیو |
| `materials/` | — (فقط README) متریال‌های نهایی‌شده |

## قواعد

- فقط به `@kia./shared` وابسته است؛ **ممنوع** است از دپارتمان دیگری import شود.
- نقطهٔ اتصال: مسیر `/material` در `apps/group/src/app/(material)/material/page.tsx`
  (ظاهر و URL فریز شده — فقط محل فایل‌ها عوض شده).
- چون بدون build است، در `build:libs` شرکت نمی‌کند؛ `typecheck` و `lint` خودِ پکیج اجرا می‌شود.

## دستورات

```bash
pnpm --filter @kia./kia-material typecheck
pnpm --filter @kia./kia-material lint
```
