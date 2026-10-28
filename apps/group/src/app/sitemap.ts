import type { MetadataRoute } from 'next';
import { courseCatalog } from '@/lib/courseCatalog';
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Public static paths only, plus db.json course URLs when this is the GitHub
 * Pages demo export. A normal build does not advertise those slugs: the live
 * catalog is the API, and a down API must not be replaced with invented URLs.
 * Private app routes stay omitted (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/courses' || path === '/material' ? 0.8 : 0.6,
  }));

  const courseEntries: MetadataRoute.Sitemap =
    process.env.GITHUB_PAGES === 'true'
      ? courseCatalog.map((course) => ({
          url: absoluteUrl(`/courses/${course.slug}`),
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      : [];

  return [...staticEntries, ...courseEntries];
}
