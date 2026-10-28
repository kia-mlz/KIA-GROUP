# گزارش آمادگی تولید — ۲۸ اکتبر ۲۰۲۶

این سند نتیجهٔ بررسی کد فعلی و اصلاح‌های همین روز است. ادعاهای قبلی دوباره با کد سنجیده شدند. هیچ commit یا push انجام نشده. پایگاه `kia_academy` drop، reset یا seed نشده است.

## A. خلاصه اجرایی

کد برای یک میزبان واقعی، بعد از پیکربندی بیرونی، قابل استقرار است. دامنه، TLS (DNS و Let's Encrypt سمت اپراتور)، کاوه‌نگار، merchant زندهٔ پرداخت و SMTP در این محیط وجود ندارند. به همین دلیل وضعیت **READY FOR HOSTING نیست**.

تصمیم: **READY AFTER EXTERNAL CONFIGURATION**

مسیرهای تیکت، دوره و درس دیگر با `dynamicParams = false` روی `next start` و ایمیج standalone قفل نیستند. ثبت‌نام و پرداخت در production همچنان درگاه dev را رد می‌کنند. پروب جدید `GET /api/ready` همین را بدون افشای راز گزارش می‌کند و HEALTHCHECK داکر روی `/api/health` مانده است.

## B. اصلاحات

### P0-1 — پارامترهای ناشناخته

ادعا درست بود: چهار صفحه `dynamicParams = false` داشتند و `generateStaticParams` فقط اسلاگ‌های `db.json` یا شناسهٔ دمو را برمی‌گرداند. در Next 16.4.2 عبارت `process.env.GITHUB_PAGES !== 'true'` برای segment config مجاز نیست (گره `BinaryExpression` بیلد را می‌شکند). مقدار صریح `true` هم با `output: 'export'` خطا می‌دهد و مقدار `false` همان 404 میزبان زنده است.

این export از این فایل‌ها حذف شد. پیش‌فرض سرور on-demand است. `generateStaticParams` برای خروجی Pages باقی مانده است.

- `apps/group/src/app/dashboard/tickets/[id]/page.tsx`
- `apps/group/src/app/admin/tickets/[id]/page.tsx`
- `apps/group/src/app/(academy)/courses/[slug]/page.tsx`
- `apps/group/src/app/(academy)/learn/[courseSlug]/[lessonSlug]/page.tsx`

صفحهٔ آزمون دوره و layout ویرایش دورهٔ ادمین از قبل این پرچم را نداشتند و دست نخورده‌اند. مانیفست prerender بیلد تولید برای این مسیرها `compute: "blocking"` است؛ همان حالت صفحهٔ آزمون که از قبل on-demand بود. یک درخواست HTTP زنده به شناسهٔ ناشناخته زده نشد.

### P0-2 — آمادگی، نه زنده بودن

SMS و پرداخت dev در production همچنان رد می‌شوند. پیش‌فرض‌های `payment.provider = dev` و `sms.enabled = false` عوض نشدند.

`GET /api/health` فقط دیتابیس را چک می‌کند. `GET /api/ready` می‌گوید پیامک یک ارائه‌دهندهٔ واقعی است یا نه و درگاه `dev` نیست. کلید API، قالب، merchant id و متن خطای اتصال در پاسخ نیست. در production اگر ثبت‌نام یا پرداخت کار نکند وضعیت 503 است. در development و test همیشه 200 با بدنهٔ ساخت‌یافته است. HEALTHCHECK داکر همچنان `/api/health` است.

### P1-1 — آدرس عمومی ایمیج وب

`.github/workflows/docker-publish.yml` متغیرهای ریپازیتوری `NEXT_PUBLIC_APP_URL`، `NEXT_PUBLIC_API_URL` و `API_PROXY_TARGET` را فقط وقتی مقدار دارند به build-arg ایمیج web می‌دهد. اگر `NEXT_PUBLIC_APP_URL` خالی باشد job شکست نمی‌خورد و در لاگ می‌گوید ایمیج host-ready نیست. رازی در workflow نیست. `docker compose` از قبل همین argها را از `.env.docker` می‌گرفت.

### P1-2 — نقشه سایت

برای بیلد عادی، sitemap فقط `PUBLIC_SITEMAP_PATHS` است و اسلاگ‌های `db.json` را تبلیغ نمی‌کند. خروجی Pages (`GITHUB_PAGES=true`) هنوز دوره‌های دمو را دارد. متادیتای دوره در بیلد زنده عنوان کاتالوگ `db.json` را مهر نمی‌کند. `robots.ts` سطح‌های خصوصی را disallow کرده و هاب‌های عمومی دپارتمان را noindex نکرده است. بدنهٔ sitemap همین بیلد تولید فقط `/courses` دارد، نه `/courses/<slug>`.

### P1-4 / P2-6 — پیش‌پرواز Docker

`scripts/preflight-docker-env.mjs` و اسکریپت `pnpm docker:preflight`. اگر `.env.docker` باشد همان را می‌خواند، وگرنه `.env.docker.example`. فایل `.env.docker` ساخته نشد. روی example باید شکست بخورد و شکست. مقدار راز چاپ نمی‌شود. فیکسچر امن: `scripts/fixtures/docker-preflight.pass`.

### P2-1 — مانیفست

`apps/group/public/manifest.webmanifest` با `dir: rtl`، `lang: fa`، `start_url: /`، `display: standalone` و آیکون‌های موجود `/favicon.svg` و `/brand/logo-mark.svg`. آیکون باینری ساخته نشد. بیلد مسیر `/manifest.webmanifest` را استاتیک نشان داد.

### P2-3 — توسعه بدون Infisical

`dev:local` همان web+api را بدون Infisical اجرا می‌کند. اسکریپت `dev` با Infisical سر جایش است.

### P2-5 — هندل‌های باز Jest در platform

نشت از کلاینت Redis (تلاش مجدد) و `setTimeout` ذخیره‌ساز حافظهٔ throttler بود، نه از خود event bus. هر دو هوک خاموشی سوکت و تایمر را می‌بندند. در تست، `retryStrategy` بی‌نهایت نیست. ۱۱ تست با `--detectOpenHandles` بدون force-exit تمام شدند.

### P2-4 — بازپرداخت

ریاضی پول و فراخوانی درگاه عوض نشد. متن دیالوگ ادمین (فارسی و انگلیسی) می‌گوید برگشت وجه کارت در درگاه خودکار نیست و باید دستی انجام شود.

### P2-2

middleware اضافه نشد تا `output: 'export'` نشکند. احراز هویت API سروری سر جایش است.

### سایر

نسخهٔ pnpm در `AGENTS.md` ریپو به `11.19.0` اصلاح شد. کامنت Dockerfile از Next 15 به Next 16 اصلاح شد.

## C. دستورها و نتایج واقعی

محیط: Node `v24.19.0`، pnpm `11.19.0`. graphify اجرا نشد چون `graphify-out/graph.json` وجود ندارد.

| دستور | نتیجه |
| --- | --- |
| `pnpm --filter @kia./platform exec jest --detectOpenHandles --forceExit=false` | خروج ۰. Test Suites: 3 passed. Tests: 11 passed. هشدار force-exit و لیست open handle نبود. |
| `pnpm --filter @kia./api exec jest src/group/health/readiness.controller.spec.ts` | خروج ۰. Tests: 6 passed. |
| `pnpm lint` | خروج ۰. |
| `pnpm typecheck` | خروج ۰. |
| `pnpm test` (بعد از آخرین ویرایش درخت) | خروج ۰. brand 9، permissions 12، shared 63، platform 11، group 248، kia-event 9، kia-academy 27، api 132، preflight (node:test) 4. جمع ۵۱۵. fail صفر. |
| `node scripts/preflight-docker-env.mjs .env.docker.example` | خروج ۱. نام‌ها: JWT_SECRET، JWT_REFRESH_SECRET، CORS_ORIGIN، SITE_DOMAIN، POSTGRES_PASSWORD، NEXT_PUBLIC_APP_URL. مقدار رمز و placeholder چاپ نشد. |
| `node scripts/preflight-docker-env.mjs scripts/fixtures/docker-preflight.pass` | خروج ۰. `preflight ok`. |
| `node --test scripts/preflight-docker-env.test.mjs` | ۴ passed، ۰ failed (هم داخل `pnpm test` و هم جدا). |
| `pnpm build` بار اول | خروج ۱. Next 16.4.2: `Unsupported node type "BinaryExpression" at "dynamicParams"`. |
| `pnpm build` بعد از حذف آن export | خروج ۰. Next.js 16.4.2. 373 صفحهٔ استاتیک ساخته شد. nest build هم تمام شد. |

`prisma migrate status` با URL مستندِ localhost در `apps/api/.env.example` (فایل `.env` در درخت نبود): «20 migrations found» و «Database schema is up to date!». migrate deploy، migrate dev، reset و seed اجرا نشد. دیتابیس drop نشد.

اجرا نشد:

- `docker build` / `docker compose`. `docker info` خروج ۱: `failed to connect to the docker API at unix:///Users/kiamlz/.docker/run/docker.sock` (دیمون بالا نیست).
- `pnpm test:e2e`. کش Playwright روی این ماشین `chromium-1234` دارد، ولی e2e بالا آورده نشد (سرور و سناریوی کامل خارج از دستورهای الزامی این پاس بود).
- QA مرورگر. مانیفست و متن بازپرداخت در مرورگر دیده نشد.

## D. وضعیت دپارتمان‌ها

این پاس محصولی برای Work، Community، Lab یا API متریال نساخته است.

- **Academy** و **Event** همان دامنه‌های موجودند (دوره، آزمون، آمادگی، بوت‌کمپ، مسابقه).
- **Work:** `/work` با `permanentRedirect` به `/freelance` می‌رود. صفحهٔ فریلنس به فرم تماس و مسیر آموزش لینک می‌دهد، نه تابلوی آگهی شغل. پنل یادگیرنده پوستهٔ «به‌زودی» است.
- **Community** و **Lab:** متن «به‌زودی در دسترس قرار می‌گیرد» و لینک تماس / پنل. فید، آرشیو آزمایشگاه یا بورد شغلی که 404 بدهد وعده داده نشده است.
- **Material:** صفحهٔ عمومی `MaterialStudio` سمت کلاینت است. API جداگانهٔ متریال ساخته نشد. پنل، ورود به همان استودیو را نشان می‌دهد.

## E. امنیت

CSP، strictness تایپ‌اسکریپت، lint، احراز هویت و رد شدن SMS/پرداخت dev در production ضعیف نشدند. CORS لوکال در production هنوز در `main.ts` فرآیند را می‌کشد. پیش‌پرواز همان را قبل از بوت داکر می‌گیرد و مقدار راز را چاپ نمی‌کند. `/api/ready` کلید، قالب و merchant id را برنمی‌گرداند. workflow انتشار secret ندارد. بازنویسی تاریخ git برای رازهای قدیمی انجام نشد.

## F. پایگاه داده

اسکیمای `kia_academy` روی localhost با ۲۰ مهاجرت «up to date» است. دادهٔ موجود دست نخورده است. تمرین دیتابیس تمیز روی نام جدید انجام نشد.

## G. سئو و رابط کاربری

نقشهٔ سایت بیلد غیر Pages اسلاگ دمو را فهرست نمی‌کند. هاب‌های عمومی (`/material`، `/freelance`، `/labs`، `/community` و بقیهٔ `PUBLIC_SITEMAP_PATHS`) در robots مجازند. سطح‌های خصوصی disallow هستند. عنوان سئوی جزئیات دوره در بیلد زنده عمومی است («دوره») چون پرسیدن از API هنگام بیلد، در صورت خاموش بودن API، نباید بیلد را بشکند یا اسلاگ جعلی بسازد. مانیفست اضافه شد. متن بازپرداخت محدودیت دستی درگاه را نشان می‌دهد. این دو سطح در مرورگر چک نشدند.

بیلد محلی `pnpm build` بدون `NEXT_PUBLIC_APP_URL` بود؛ sitemap ساخته‌شده مبدأ `http://localhost:3000` دارد. این همان مشکلی است که build-arg و پیش‌پرواز برای ایمیج میزبان جلویش را می‌گیرند.

## H. دوآپس

- Liveness: `/api/health` و HEALTHCHECK داکر.
- Readiness: `/api/ready`. آن را جایگزین HEALTHCHECK نکنید.
- `pnpm docker:preflight` قبل از `docker:up`.
- ایمیج GHCR وب بدون variable `NEXT_PUBLIC_APP_URL` host-ready نیست. job انتشار برای این خالی بودن fail نمی‌شود.
- `dev:local` برای توسعه بدون Infisical.

ران‌بوک و چک‌لیست پیش از لانچ در همین نقطه‌ها به‌روز شدند. گزارش‌های ممیزی قدیمی بازنویسی نشدند.

## I. موارد باقی‌مانده

- دامنه، رکورد DNS، صدور Let's Encrypt.
- کلید واقعی کاوه‌نگار و قالب تأییدشده.
- merchant زندهٔ زرین‌پال / آیدی‌پی / استرایپ (sandbox خاموش) و URLهای callback روی HTTPS.
- SMTP واقعی.
- اینماد.
- API برگشت وجه درگاه (عمداً صدا زده نمی‌شود).
- middleware سمت HTML (P2-2) تا export صفحات نشکند.
- عنوان اختصاصی سئو برای هر دوره از منبع زنده، بدون وابستگی بیلد به بالا بودن API.
- دپارتمان‌های خالی به محصول کامل تبدیل نشده‌اند.
- انتشار ایمیج و `docker build` در این محیط انجام نشد.
- بازنویسی تاریخ git.

## J. تصمیم نهایی

**READY AFTER EXTERNAL CONFIGURATION**

تا دامنه، TLS، کاوه‌نگار و merchant پرداخت توسط اپراتور تنظیم نشود، و `pnpm docker:preflight` روی `.env.docker` واقعی عبور نکند، و ایمیج وب با `NEXT_PUBLIC_APP_URL` عمومی ساخته نشود، این درخت **READY FOR HOSTING نیست**.
