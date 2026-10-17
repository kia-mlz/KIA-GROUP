import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { DEFAULT_LOCALE, dirForLocale } from '@/i18n/locales';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  absoluteUrl,
  buildWebsiteJsonLd,
  getSiteUrl,
} from '@/lib/seo';
import '@/styles/globals.css';

/**
 * Pelak FA — the kia. brand typeface (KIA-Color-Font identity) and the
 * site-wide UI font for every page, from the landing hero to admin tables.
 */
const pelak = localFont({
  src: [
    { path: './fonts/pelak/PelakFA-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/pelak/PelakFA-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/pelak/PelakFA-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/pelak/PelakFA-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/pelak/PelakFA-ExtraBold.woff2', weight: '800', style: 'normal' },
    { path: './fonts/pelak/PelakFA-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-pelak',
  display: 'swap',
  adjustFontFallback: false,
});

/** Code / latin mono font (self-hosted — no Google Fonts network dependency at build time). */
const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jetbrains-mono/jetbrains-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1626' },
  ],
};

/**
 * Locale is resolved on the client (LanguageProvider) so this layout stays
 * compatible with `output: 'export'` / GitHub Pages. Reading `cookies()` here
 * marks every route dynamic and breaks the Pages static build.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = DEFAULT_LOCALE;
  const dir = dirForLocale(locale);
  const jsonLd = buildWebsiteJsonLd();

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${pelak.variable} ${jetbrainsMono.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Neutralize any literal `</script>` so dynamically sourced JSON-LD
            // (e.g. admin-entered course titles) can never break out of the tag.
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <ClientProviders initialLocale={locale}>
          <SiteChrome>{children}</SiteChrome>
        </ClientProviders>
      </body>
    </html>
  );
}
