# راهنمای استقرار پروڈاکشن (Runbook) — Kia

این سند گام‌به‌گام فرآیند راه‌اندازی پلتفرم روی یک سرور شخصی (VPS) با Docker را شرح می‌دهد.
ابزارهای خارج از کد که باید خودتان تهیه کنید: دامنه، کلید کاوه‌نگار، merchant درگاه پرداخت، SMTP، شناسه اینماد.

---

## ۱. پیش‌نیازها

| نیاز | توضیح |
| --- | --- |
| سرور | Ubuntu 22.04/24.04، حداقل ۲ هسته CPU / 4GB RAM / 40GB دیسک |
| دامنه | یک رکورد `A` به IP سرور (مثلاً `kia.example.com`) — فقط همین یکی کافی است |
| نرم‌افزار | Docker Engine ≥ 24 و Docker Compose v2 (`docker compose version`) |
| دسترسی | SSH با کاربر غیر root دارای sudo |

نصب Docker (روی سرور):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # سپس logout/login
```

فایروال — فقط این پورت‌ها باز باشند:

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

> پورت‌های app/postgres/kuma به‌صورت پیش‌فرض فقط روی `127.0.0.1` بایند می‌شوند؛
> تنها Caddy روی 80/443 عمومی است.

## ۲. دریافت کد و ساخت فایل تنظیمات

```bash
sudo mkdir -p /opt/kia-academy && sudo chown $USER /opt/kia-academy
git clone https://github.com/kia-mlz/KIA-GROUP.git /opt/kia-academy
cd /opt/kia-academy
pnpm docker:setup          # کپی .env.docker.example → .env.docker
```

`.env.docker` را ویرایش کنید (مقادیر الزامی پروڈاکشن):

```bash
# رازهای تصادفی — هر بار دستور جدا اجرا شود
openssl rand -base64 48     # → JWT_SECRET
openssl rand -base64 48     # → JWT_REFRESH_SECRET
openssl rand -base64 24     # → POSTGRES_PASSWORD و BOOTSTRAP_ADMIN_PASSWORD
```

| متغیر | مقدار |
| --- | --- |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | خروجی `openssl rand -base64 48` (هر دو متفاوت) |
| `POSTGRES_PASSWORD` | خروجی رندوم + هماهنگ در `DATABASE_URL` |
| `SITE_DOMAIN` | `kia.example.com` (بدون `https://`) |
| `ACME_EMAIL` | ایمیلی که اخطار گواهی به آن می‌رسد |
| `CORS_ORIGIN` / `APP_URL` / `NEXT_PUBLIC_APP_URL` | `https://kia.example.com` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `OTP_DEV_EXPOSE` | حذف کامل یا `false` |
| `SEED_DATABASE` | `false` (به‌هیچ‌وجه `true` نکنید) |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | ادمین اول — **بعد از اولین ورود حذف شوند** |
| `SMTP_*` | حساب SMTP واقعی (بازیابی رمز عبور و ایمیل‌ها وابسته به آن است) |

`NEXT_PUBLIC_APP_URL` در زمان **بیلد** ایمیج وب پخته می‌شود (build-arg در `docker compose` و، اگر ست شده باشد، variable گیت‌هاب در workflow انتشار). مقدار `localhost` یعنی ایمیج برای هاست واقعی آماده نیست.

قبل از بالا آوردن استک، پیش‌پرواز را اجرا کنید. اسکریپت فقط **نام** متغیر و دلیل را چاپ می‌کند، نه مقدار راز. روی `.env.docker.example` باید با کد ۱ بشکند؛ فقط فایل پر شدهٔ production باید عبور کند:

```bash
pnpm docker:preflight
# یا صریح:
node scripts/preflight-docker-env.mjs .env.docker
```

وقتی `NODE_ENV=production` است این‌ها شکست‌اند: `JWT_SECRET` / `JWT_REFRESH_SECRET` خالی، کوتاه‌تر از ۳۲ نویسه، یا برابر placeholderهای `apps/api/src/config/env.validation.ts`؛ `CORS_ORIGIN` خالی یا شامل localhost / `127.0.0.1`؛ `SITE_DOMAIN` خالی؛ `POSTGRES_PASSWORD` خالی یا برابر رمز نمونه؛ `NEXT_PUBLIC_APP_URL` خالی یا localhost.

## ۳. راه‌اندازی

```bash
pnpm docker:preflight                 # باید ۰ باشد؛ example فایل شکست می‌خورد
pnpm docker:build
pnpm docker:up
docker compose --profile full ps      # هر ۴ سرویس healthy
curl -k https://kia.example.com/api/health   # {"status":"ok",...}  liveness، فقط دیتابیس
curl -k https://kia.example.com/api/ready    # آمادگی ثبت‌نام/پرداخت؛ تا درگاه و SMS واقعی نباشد در production برابر 503
```

`/api/health` زنده بودن پروسه و دیتابیس است. HEALTHCHECK داکر همان مسیر را می‌زند تا کانتینری که هنوز کاوه‌نگار یا درگاه ندارد در حلقهٔ ری‌استارت نیفتد. `/api/ready` را جایگزین HEALTHCHECK نکنید. در production اگر پیامک ارائه‌دهندهٔ واقعی نباشد یا درگاه `dev` باشد (یا خاموش / بدون اعتبار لازم) پاسخ 503 است؛ در development همیشه 200 با بدنهٔ ساخت‌یافته. کلید API و merchant id در پاسخ نیست.

مسیرهای داینامیک تیکت، دوره و درس دیگر `dynamicParams = false` ندارند. Next 16 فقط مقدار بولینِ لیترال را در این segment config می‌پذیرد (`process.env.GITHUB_PAGES !== 'true'` بیلد را می‌شکند). مقدار صریح `true` با `output: 'export'` ناسازگار است و مقدار `false` شناسه‌های واقعی را روی `next start` و ایمیج standalone با 404 برمی‌گرداند. با حذف این export، پیش‌فرض سرور on-demand است. خروجی Pages همچنان فقط مسیرهای `generateStaticParams` را می‌نویسد.

Caddy در اولین اجرا گواهی Let's Encrypt را صادر می‌کند (چند ثانیه).
لاگ آن: `docker compose --profile full logs -f caddy`

## ۴. ورود اول ادمین و بستن مسیر bootstrap

1. `https://kia.example.com/admin` → ورود با `BOOTSTRAP_ADMIN_EMAIL/PASSWORD`
2. فعال‌سازی 2FA از `Admin → Security` (QR + کدهای بازیابی را ذخیره کنید)
3. تغییر رمز از پروفایل؛ سپس از `.env.docker` دو خط `BOOTSTRAP_ADMIN_*` را **حذف** کنید:

```bash
pnpm docker:up -d    # بازسازی کانتینر api بدون متغیرهای bootstrap
```

> سازوکار bootstrap امن است: فقط وقتی هیچ SUPER_ADMIN در DB نباشد کاربر می‌سازد؛
> رمز را هرگز لاگ نمی‌کند؛ اما اصول خوب این است که بعد از استفاده از env پاک شود.

## ۵. تنظیم سرویس‌های خارجی (از پنل ادمین — بدون کد)

### ۵.۱ پیامک OTP — کاوه‌نگار (بلاکر مسیر ثبت‌نام)
مسیر: **Admin → OTP/SMS**
- Provider = `kavenegar`، کلید API واقعی
- یک الگوی Verify در پنل کاوه‌نگار بسازید و تأیید کنید؛ نامش را در `template` ثبت کنید
- تست: ثبت‌نام با شماره واقعی؛ کد باید از کاوه‌نگار برسد (نه لاگ سرور)

### ۵.۲ درگاه پرداخت (مسیر پول)
مسیر: **Admin → Payment settings**
- Provider = `zarinpal` (یا `idpay`)، merchant id واقعی، sandbox = خاموش
- `callbackUrl` / `successUrl` / `failureUrl` = آدرس‌های HTTPS با دامنه واقعی
- تست هر ۳ نوع محصول: خرید آزمایشی موفق + مسیر لغو/ناموفق → `checkout/success|cancel`
- فاکتور، شماره‌گذاری و نمایش تومان را چک کنید

### ۵.۳ بازپرداخت (PAY-3b)
- **داخل سامانه:** `Admin → Payments → Refund` — برگشت به کیف پول یادگیرنده + لغو
  دسترسی دوره/نقشه راه (برای refund کامل) در یک تراکنش، با دلیل اجباری و ثبت audit log
- **سمت درگاه:** برگشت وجه واقعی کارت بانکی هنوز دستی است — از پنل زرین‌پال/آیدی‌پی
  انجام دهید و در runbook سازمانی خود ثبت کنید (چه کسی، چه زمانی، SLA)

### ۵.۴ اینماد
مسیر: **Admin → Enamad** — `codeId` و `code` از پنل اینماد؛ نشان در فوتر ظاهر می‌شود.

### ۵.۵ محتوا
- دوره‌ها/درس‌های seed دمو هستند — یا ویدیوهای واقعی جایگزین کنید یا منتشر نکنید
- متن `terms` و `privacy` را با شرایط واقعی کسب‌وکار بازبینی کنید
- حساب‌های دمو (`alex@kia.academy`) را در صورت seed شدن حذف/معلق کنید

## ۶. مانیتورینگ و بکاپ

### مانیتورینگ (اختیاری، پروفایل monitor)

```bash
docker compose --profile monitor up -d
# داشبورد: http://127.0.0.1:3101 (فقط از سرور؛ با SSH tunnel: ssh -L 3101:127.0.0.1:3101 user@server)
```

سه مانیتور HTTP بسازید: `https://kia.example.com/`، `https://kia.example.com/api/health` (liveness؛ سیاست restart کانتینر) و `https://kia.example.com/api/ready` (آمادگی SMS/درگاه — 503 اینجا یعنی ری‌استارت کانتینر درست نیست، پیکربندی پنل ادمین لازم است).
هشدار (تلگرام/ایمیل) تنظیم کنید.

### بکاپ خودکار

```bash
./scripts/backup.sh                     # یک بار دستی
./scripts/backup.sh /var/backups/kia    # مسیر دلخواه
crontab -e
#   0 3 * * *  cd /opt/kia-academy && ./scripts/backup.sh >> backups/backup.log 2>&1
```

- روزانه: `db-YYYYMMDD-HHMMSS.dump` (فرمت custom pg_dump) + آرشیو `uploads`
- نگهداری ۷ نسخهٔ آخر از هر کدام؛ `backups/` گیت-ایگنور است
- **آزمون بازیابی را یک‌بار واقعاً انجام دهید:** `./scripts/restore.sh backups/db-...dump`
  (مخرب است — فقط در پنجره نگهداری یا سرور تست)
- نسخه‌های قدیمی را دور از سرور (S3/دیسک دیگر) هم نگه دارید

## ۷. چک‌لیست go-live

- [ ] `docker compose --profile full ps` — همه سرویس‌ها healthy
- [ ] `pnpm docker:preflight` روی `.env.docker` واقعی = ۰ (فایل example باید شکست بخورد)
- [ ] `curl https://SITE_DOMAIN/api/health` = ok؛ `https://` بدون اخطار مرورگر
- [ ] `curl https://SITE_DOMAIN/api/ready` بعد از تنظیم کاوه‌نگار و درگاه غیر dev = 200 (قبل از آن 503 طبیعی است و نباید HEALTHCHECK را عوض کند)
- [ ] `pnpm test:e2e` روی build پروڈاکشن پاس (پیش از استقرار روی سیستم خودتان)
- [ ] ثبت‌نام با شماره واقعی → دریافت OTP از کاوه‌نگار → تکمیل پروفایل
- [ ] خرید آزمایشی هر ۳ نوع محصول + یک مسیر ناموفق/لغو
- [ ] بازیابی رمز عبور با SMTP واقعی (لینک ایمیل‌شده کار می‌کند)
- [ ] 2FA ادمین فعال؛ `BOOTSTRAP_ADMIN_*` از `.env.docker` حذف شده
- [ ] یک‌بار `./scripts/restore.sh` روی سرور تست انجام شده
- [ ] لاگ‌ها دنبال می‌شوند و uptime monitor هشدار می‌دهد

## ۸. به‌روزرسانی و Rollback

دو روش برای استقرار/آپدیت وجود دارد:

### روش الف — Pull ایمیج آماده از GHCR (پیشنهادی؛ نیازی به build روی سرور نیست)

هر push به `main` ایمیج‌های api و web را بیلد و منتشر می‌کند (workflow «Docker Publish»):

- `ghcr.io/kia-mlz/kia./api:main` (+ تگ `sha-<commit>` برای هر کامیت)
- `ghcr.io/kia-mlz/kia./web:main`

ایمیج web فقط وقتی variableهای ریپازیتوری `NEXT_PUBLIC_APP_URL` و در صورت نیاز `NEXT_PUBLIC_API_URL` و `API_PROXY_TARGET` ست شده باشند آن‌ها را به‌عنوان build-arg می‌گیرد. اگر `NEXT_PUBLIC_APP_URL` خالی باشد job انتشار شکست نمی‌خورد، ولی ایمیج **host-ready نیست** (پیش‌فرض Dockerfile یعنی `http://localhost:3000` داخل باندل می‌ماند و API در production به‌خاطر CORS لوکال بالا نمی‌آید). قبل از تکیه بر ایمیج GHCR آن variable را ست کنید. بیلد محلی `docker compose` از قبل همین argها را از `.env.docker` پاس می‌دهد.

روی سرور یک `docker-compose.override.yml` بسازید:

```yaml
services:
  api:
    image: ghcr.io/kia-mlz/kia./api:main
  web:
    image: ghcr.io/kia-mlz/kia./web:main
```

اگر ریپو/پکیج خصوصی است، یک بار لاگین: `docker login ghcr.io -u <user> -p <PAT با read:packages>`

```bash
# انتشار نسخه جدید (تگ دقیق‌تر: به‌جای main از sha-<commit> استفاده کنید)
docker compose --profile full pull api web
docker compose --profile full up -d

# Rollback: همان دو دستور با تگ قبلی، مثلاً:
#   image: ghcr.io/kia-mlz/kia./api:sha-<کامیت قبلی>
```

### روش ب — Build روی سرور (بدون وابستگی به GHCR)

```bash
git pull && pnpm docker:build && pnpm docker:up -d

# Rollback
git checkout <tag قبلی>
pnpm docker:build && pnpm docker:up -d
```

# مهاجرت‌های DB در هر دو روش، خودکار در boot اجرا می‌شوند (migrate deploy — غیرمخرب)
# اگر مهاجرت جدید اعمال شده: ابتدا ./scripts/restore.sh با آخرین بکاپ قبل از آپدیت

> قاعده طلایی: قبل از هر آپدیتی که مهاجرت DB دارد، `./scripts/backup.sh` را دستی اجرا کنید.

## ۹. متغیرهای عملیاتی سریع

| کار | دستور |
| --- | --- |
| وضعیت سرویس‌ها | `docker compose --profile full ps` |
| لاگ زنده | `pnpm docker:logs` |
| ری‌استارت فقط API | `docker compose --profile full restart api` |
| بکاپ فوری | `./scripts/backup.sh` |
| ورود به psql | `docker compose exec postgres psql -U kia_academy` |
| چرخش JWT secrets | مقدارهای جدید در `.env.docker` + `pnpm docker:up -d` (همه سشن‌ها invalid می‌شوند) |
