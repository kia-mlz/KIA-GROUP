# @kia./platform — هستهٔ مشترک کیا.

**Platform kernel** — لایهٔ زیرساختی که همهٔ دپارتمان‌ها (و پوستهٔ `apps/api`) به آن وابسته‌اند.

## چه چیزی اینجاست؟

| مسیر | محتوا |
| --- | --- |
| `src/prisma/` | `PrismaModule` (Global) + `PrismaService` — کلاینت Prisma 7 با آداپتور `pg` |
| `src/generated/prisma/` | خروجی `prisma generate` (git-ignored) — کلاینت تایپ‌شدهٔ مشترک مونوریپو |
| `src/common/` | گاردها، دکوراتورها، فیلترهای HTTP، رویدادهای دامنه (`EventBus`)، محدودسازی نرخ |
| `src/group/site-settings/` | تنظیمات سایت (ادمین) |
| `src/group/media/` | آپلود/مدیریت رسانه |
| `src/group/email/` | ارسال ایمیل (SMTP + لاگ) |

## قواعد

- این پکیج **هیچ** وابستگی به دپارتمان‌ها ندارد؛ دپارتمان‌ها فقط به آن وابسته‌اند.
- خروجیٔ `prisma generate` اینجاست (مسیر در `apps/api/prisma/schema.prisma` تنظیم شده)؛
  بنابراین **اول** `pnpm db:generate` و **بعد** `pnpm build:libs` اجرا می‌شود.
- ورودی رسمی: `src/index.ts` (همهٔ نمادهای عمومی از همین‌جا export می‌شوند).

## دستورات

```bash
pnpm --filter @kia./platform build      # tsc → dist/
pnpm --filter @kia./platform typecheck
pnpm --filter @kia./platform test       # jest (۳ spec)
pnpm --filter @kia./platform lint
```
