# Kia Admin — Minimal panel architecture

Replaces the Ops Center / control-room chrome with a calm enterprise shell.

## Principles

1. **Restraint** — hairline borders, quiet surfaces, no card clutter, no multi-shadow, no emoji chrome.
2. **Platform vs Department** — shared ops in platform chrome; department tools only inside that workspace.
3. **No fake actions** — empty departments stay honest until real APIs exist.
4. **Permissions from server** — `useAdminAccess` / `AdminAccessGuard`; `/api/admin/*` contracts unchanged.
5. **Persian / RTL first** — brand tokens via `--dept-*` only.

## Information architecture

```text
نمای کلی (/admin)
دپارتمان‌ها (/admin/departments)

عمومی — کاربران، کارکنان، پشتیبانی، مالی
دپارتمان‌ها — آکادمی / کار / متریال / ایونت / کامیونیتی / لب
سیستم — گزارش‌ها، حسابرسی، تنظیمات، امنیت
```

## Sources of truth

| Concern | Path |
| --- | --- |
| Nav registry | `apps/group/src/lib/adminNav.ts` |
| Shell | `apps/group/src/app/admin/AdminLayoutClient.tsx` |
| Theme | `apps/group/src/styles/admin-minimal.css` |
| CRUD surfaces | existing `admin.css` + page forms (bridged under `.am-shell`) |
