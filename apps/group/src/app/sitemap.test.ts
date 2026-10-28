import { afterEach, describe, expect, it } from 'vitest';
import { generateMetadata } from '@/app/(academy)/courses/[slug]/layout';
import { primaryCourseSlug, courseCatalog } from '@/lib/courseCatalog';
import sitemap from '@/app/sitemap';

const originalPages = process.env.GITHUB_PAGES;

afterEach(() => {
  if (originalPages === undefined) delete process.env.GITHUB_PAGES;
  else process.env.GITHUB_PAGES = originalPages;
});

describe('sitemap catalog urls', () => {
  it('lists only public static paths when this is not the Pages demo export', () => {
    delete process.env.GITHUB_PAGES;
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain('/courses');
    expect(urls.some((pathname) => pathname.startsWith('/courses/'))).toBe(false);
    expect(urls).toContain('/material');
    expect(urls).toContain('/freelance');
    expect(urls).toContain('/labs');
    expect(urls).toContain('/community');
  });

  it('includes db.json course urls for the Pages demo export', () => {
    process.env.GITHUB_PAGES = 'true';
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain(`/courses/${primaryCourseSlug}`);
    expect(urls.filter((pathname) => pathname.startsWith('/courses/'))).toHaveLength(
      courseCatalog.length,
    );
  });
});

describe('course metadata', () => {
  it('does not publish db.json titles outside the Pages demo export', async () => {
    delete process.env.GITHUB_PAGES;
    const demo = courseCatalog.find((course) => course.slug === primaryCourseSlug);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: primaryCourseSlug }),
      children: null,
    });
    expect(meta.title).toBe('دوره');
    expect(meta.title).not.toBe(demo?.title);
  });

  it('uses the demo catalog title for the Pages export', async () => {
    process.env.GITHUB_PAGES = 'true';
    const demo = courseCatalog.find((course) => course.slug === primaryCourseSlug);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: primaryCourseSlug }),
      children: null,
    });
    expect(meta.title).toBe(demo?.title);
  });
});
