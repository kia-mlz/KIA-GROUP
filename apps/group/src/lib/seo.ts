import type { Metadata } from 'next';
import { messages } from '@/i18n/messages';
import { DEFAULT_LOCALE } from '@/i18n/locales';

const fa = messages[DEFAULT_LOCALE];

/** Absolute site origin used for canonical / OG / sitemap URLs. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export const SITE_NAME = fa.common.brand;
export const SITE_TITLE = fa.meta.title;
export const SITE_DESCRIPTION = fa.meta.description;

export const noIndexRobots = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Shared metadata for public marketing / catalog pages. */
export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
    robots: { index: true, follow: true },
  };
}

/** Private / transactional surfaces — keep out of search indexes. */
export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: noIndexRobots,
    // Clear any inherited homepage canonical from the root layout.
    alternates: { canonical: null },
  };
}

/** Static public paths included in sitemap (derived from real app routes). */
export const PUBLIC_SITEMAP_PATHS = [
  '/',
  '/material',
  '/courses',
  '/education',
  '/events',
  '/freelance',
  '/labs',
  '/community',
  '/contact',
  '/privacy',
  '/terms',
] as const;

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'fa-IR',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
  };
}
