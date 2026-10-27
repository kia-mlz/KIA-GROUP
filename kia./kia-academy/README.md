# @kia./kia-academy — Kia

**کیا — دپارتمان آموزش** — این پکیج مثل یک **پروژهٔ جدا** توسعه می‌یابد و فقط به
هستهٔ مشترک (`@kia./platform` + `@kia./shared`) وابسته است.

## نقشهٔ پوشه‌ها → ماژول‌های موجود

| پوشه | ماژول‌های Nest | توضیح |
| --- | --- | --- |
| `courses/` | `courses/`، `course-exams/` | کاتالوگ دوره‌ها، ثبت‌نام، آزمون‌های دوره |
| `lessons/` | — (فقط README) | دامنهٔ مستقل درس‌ها؛ فعلاً Lesson داخل `courses` مدیریت می‌شود |
| `teachers/` | — (فقط README) | پروفایل مدرسان (پیاده‌سازی نشده) |
| `students/` | `personality/`، `progress/` | وضعیت زبان‌آموز: شخصیت، پیشرفت تحصیلی |
| `learning-paths/` | `roadmaps/`، `assessments/`، `readiness/`، `test-banks/` | مسیر یادگیری: ارزیابی، آزمون آمادگی، نقشهٔ راه، بانک سؤال |
| `certificates/` | — (فقط README) | گواهی‌نامه‌ها (پیاده‌سازی نشده) |

> `bootcamp` (کمپ) به دلیل ماهیت رویدادی به `kia./kia-event/bootcamps` منتقل شد.

## قواعد معماری

- **ممنوع** است از/به دپارتمان دیگری import شود (توسط ESLint مسدود است) —
  ارتباط بین‌دپارتمانی فقط از طریق `@kia./platform` (رویدادهای دامنه) یا قراردادهای `@kia./shared`.
- نقطهٔ اتصال: `apps/api/src/app.module.ts` ماژول‌های این پکیج را ثبت می‌کند؛
  مسیرهای وب (`/education`، `/roadmap`، `/learn/...`) در `apps/group` می‌مانند (URLها فریز شده).
- نام route کنترلرها تغییری نکرده — رفتار API دقیقاً مثل قبل است.

## دستورات

```bash
pnpm --filter @kia./kia-academy build      # tsc → dist/
pnpm --filter @kia./kia-academy typecheck
pnpm --filter @kia./kia-academy test       # jest (۷ spec)
pnpm --filter @kia./kia-academy lint
```
