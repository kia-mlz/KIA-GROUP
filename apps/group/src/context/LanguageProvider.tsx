'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  createDefaultSiteSettings,
  mergeSiteSettings,
  normalizePaymentSettings,
  type PaymentCurrencyCode,
} from '@kia./shared';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/cookie';
import { createFormatters, type Formatters } from '@/i18n/formatters';
import {
  DEFAULT_LOCALE,
  dirForLocale,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
} from '@/i18n/locales';
import { en, messages } from '@/i18n/messages';
import { createTranslator, type MessageKey, type MessageParams } from '@/i18n/translate';
import { api } from '@/lib/api';

interface LanguageContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  format: Formatters;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

function hasLocaleCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`));
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: LanguageProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(parseLocale(initialLocale));
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrencyCode>(
    () => normalizePaymentSettings(createDefaultSiteSettings().payment).currency,
  );

  useEffect(() => {
    // Persian-first: prefer an explicit cookie, otherwise keep DEFAULT_LOCALE (fa).
    // Do not auto-switch to the browser language — that silently flipped the site to English.
    let next = parseLocale(initialLocale);
    if (hasLocaleCookie()) {
      next = readLocaleCookie(document.cookie);
    } else {
      writeLocaleCookie(next);
    }
    if (next !== locale) {
      setLocaleState(next);
    }

    const html = document.documentElement;
    html.lang = next;
    html.dir = dirForLocale(next);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirForLocale(locale);
    writeLocaleCookie(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((next) => {
        if (cancelled) return;
        const merged = mergeSiteSettings(createDefaultSiteSettings(), next);
        setPaymentCurrency(normalizePaymentSettings(merged.payment).currency);
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      const parsed = parseLocale(next);
      setLocaleState(parsed);
      writeLocaleCookie(parsed);
      const html = document.documentElement;
      html.lang = parsed;
      html.dir = dirForLocale(parsed);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(() => {
    const catalog = messages[locale] ?? en;
    return {
      locale,
      dir: dirForLocale(locale),
      setLocale,
      t: createTranslator(catalog, en),
      format: createFormatters(locale, paymentCurrency),
    };
  }, [locale, setLocale, paymentCurrency]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
