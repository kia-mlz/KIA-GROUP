import { LOCALE_COOKIE, parseLocale, type Locale } from './locales';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readLocaleCookie(cookieHeader?: string | null): Locale {
  if (!cookieHeader) return parseLocale(null);
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return parseLocale(null);
  const value = decodeURIComponent(match.slice(LOCALE_COOKIE.length + 1));
  return parseLocale(value);
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  const secure =
    typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${MAX_AGE_SECONDS};SameSite=Lax${secure}`;
}
