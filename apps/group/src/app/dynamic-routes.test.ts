import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appDir = __dirname;

/**
 * Next 16.4 accepts only a boolean literal for `dynamicParams`.
 * `false` 404s unknown ids on `next start` and Docker standalone.
 * `true` fails `output: 'export'` (GitHub Pages).
 * Omitting the export keeps the server default (on-demand). The Pages
 * export still only writes the paths from generateStaticParams.
 */
const ON_DEMAND_PAGES = [
  'dashboard/tickets/[id]/page.tsx',
  'admin/tickets/[id]/page.tsx',
  '(academy)/courses/[slug]/page.tsx',
  '(academy)/learn/[courseSlug]/[lessonSlug]/page.tsx',
];

/** These already allow unknown params; do not lock them to the Pages export. */
const ALREADY_DYNAMIC = [
  '(academy)/courses/[slug]/exams/[examId]/page.tsx',
  'admin/academy/courses/[slug]/edit/layout.tsx',
];

describe('dynamic route params', () => {
  it('does not force unknown params to 404, and still prebuilds demo paths', () => {
    for (const rel of ON_DEMAND_PAGES) {
      const source = readFileSync(path.join(appDir, rel), 'utf8');
      expect(source, rel).not.toMatch(/export const dynamicParams\s*=/);
      expect(source, rel).toContain('export function generateStaticParams(');
    }
  });

  it('leaves routes that already render on demand unlocked', () => {
    for (const rel of ALREADY_DYNAMIC) {
      const source = readFileSync(path.join(appDir, rel), 'utf8');
      expect(source, rel).not.toContain('dynamicParams');
    }
  });
});
