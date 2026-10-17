import type { LocaleText } from '@kia./shared';

export function localeText(value: LocaleText | undefined, locale: string): string {
  if (!value) return '';
  return locale === 'fa' ? value.fa || value.en : value.en || value.fa;
}
