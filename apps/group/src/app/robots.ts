import type { MetadataRoute } from 'next';
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Crawl policy derived from real public vs private app routes.
 * Private learner/admin/auth surfaces are disallowed and also noindex via layouts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [...PUBLIC_SITEMAP_PATHS],
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/admin',
          '/admin/',
          '/learn',
          '/learn/',
          '/login',
          '/home',
          '/tracks',
          '/assessment',
          '/readiness',
          '/roadmap',
          '/cart',
          '/checkout',
          '/rewards',
          '/bootcamp',
          '/academy/panel',
          '/events/panel',
          '/work/panel',
          '/material/panel',
          '/community/panel',
          '/labs/panel',
          '/api/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/').replace(/\/$/, ''),
  };
}
