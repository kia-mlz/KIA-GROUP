import type { PaymentCurrencyCode } from '@kia./shared';
import { normalizePaymentCurrency, toDisplayUnits } from '@kia./shared';
import type { Locale } from './locales';

export interface Formatters {
  number: (value: number) => string;
  /** Format a catalog amount stored in IRR. Respects site payment currency (irr/irt). */
  currency: (value: number, currencyOverride?: PaymentCurrencyCode | string) => string;
  percent: (value: number) => string;
  date: (value: Date | string | number) => string;
  durationMinutes: (minutes: number) => string;
  durationHours: (hours: number) => string;
  points: (value: number) => string;
}

export function createFormatters(
  locale: Locale,
  paymentCurrency: PaymentCurrencyCode = locale === 'fa' ? 'irt' : 'irr',
): Formatters {
  const numberFmt = new Intl.NumberFormat(locale);
  const percentFmt = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const labelFor = (code: PaymentCurrencyCode): string => {
    if (code === 'irt') return locale === 'fa' ? 'تومان' : 'IRT';
    return locale === 'fa' ? 'ریال' : 'IRR';
  };

  return {
    number: (value) => numberFmt.format(value),
    currency: (value, currencyOverride) => {
      const code = currencyOverride
        ? normalizePaymentCurrency(currencyOverride)
        : paymentCurrency;
      const units = toDisplayUnits(Number(value) || 0, code);
      return `${numberFmt.format(units)} ${labelFor(code)}`;
    },
    percent: (value) => percentFmt.format(value / 100),
    date: (value) => dateFmt.format(new Date(value)),
    durationMinutes: (minutes) =>
      locale === 'fa'
        ? `${numberFmt.format(minutes)} دقیقه`
        : `${numberFmt.format(minutes)} min`,
    durationHours: (hours) =>
      locale === 'fa' ? `${numberFmt.format(hours)} ساعت` : `${numberFmt.format(hours)}h`,
    points: (value) =>
      locale === 'fa' ? `${numberFmt.format(value)} امتیاز` : `${numberFmt.format(value)} pts`,
  };
}
