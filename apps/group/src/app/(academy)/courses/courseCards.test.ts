import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Course tiles used to repeat the course description under the title. It was a
 * 2–3 line wall of text in a 4-card grid (measured 103.56px on two tiles and
 * 51.78px on two others at 1280px), which stretched the rows unevenly: 365.34px
 * against 313.56px. Both grids share the `.catalog-card` tile, so the tiles now
 * read icon → title → meta (→ actions) and every card is 249.78px.
 *
 * The two grids then drifted on purpose: the public catalog's «مشاهده معرفی»
 * button was removed on feedback and the tile *is* the link there, while the
 * dashboard's "my courses" tile keeps its own two actions (enter · new ticket).
 * These tests pin both shapes and the description removal, so the copy cannot
 * creep back into either grid.
 */

const read = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8');

const publicPage = read('public-page.tsx');
// `dashboard/` is a platform route, one level above the department groups.
const myCourses = read('../../dashboard/my-courses/page.tsx');
const catalogCss = read('../../../styles/catalog-lesson.css');

/** The tile in full — opening tag (and therefore its element type) included. */
function tileOf(src: string) {
  const match = /<(\w+)[^>]*className=\{`catalog-card/.exec(src);
  expect(match, 'no course tile found').not.toBeNull();
  const tag = match![1];
  const close = `</${tag}>`;
  const end = src.indexOf(close, match!.index);
  expect(end).toBeGreaterThan(match!.index);
  return { tag, markup: src.slice(match!.index, end + close.length) };
}

const tile = {
  publicCatalog: tileOf(publicPage),
  myCourses: tileOf(myCourses),
};

describe('course card description', () => {
  it('renders no course description in either card grid', () => {
    // Scoped to the tile, not the file: a page-level intro may still use it
    // (`CourseDetail` shows it under the title on purpose).
    expect(tile.publicCatalog.markup).not.toContain('course.description');
    expect(tile.myCourses.markup).not.toContain('course.description');
  });

  it('keeps the icon → title → meta order the tile CSS relies on', () => {
    // The meta row carries the hairline that separates the tile from the rest,
    // so it must not be dropped with the description text.
    for (const [name, { markup }] of Object.entries(tile)) {
      const icon = markup.indexOf('<CourseTileIcon');
      const title = markup.indexOf('<h3>');
      const meta = markup.indexOf('className="catalog-meta"');
      expect(icon, name).toBeGreaterThan(-1);
      expect(title, name).toBeGreaterThan(icon);
      expect(meta, name).toBeGreaterThan(title);
    }
  });

  it('makes the public tile itself the link, with no action row left', () => {
    // The element carrying the tile class is a link, not an `<article>`: the
    // same clickable-tile shape as the domain doors above it in this file,
    // which is what keeps the catalog navigable now that the CTA is gone.
    expect(tile.publicCatalog.tag).toBe('Link');
    expect(tile.publicCatalog.markup).toContain('href={`/courses/${course.slug}`}');
    expect(tile.publicCatalog.markup).not.toContain('catalog-actions');
    expect(publicPage).not.toContain("t('publicCourses.viewIntro')");
    // `.catalog-card` already carries `text-decoration: none; color: inherit`
    // (base.css), which is what makes the anchor read as the tile it replaces.
    const base = read('../../../styles/base.css');
    expect(base).toMatch(/\.catalog-card \{[^}]*text-decoration: none;/);
  });

  it('keeps the dashboard tile an article with its actions and attachments', () => {
    // The feedback was scoped to the public catalog; the panel tile answers a
    // different question (resume the course, open a ticket, download files).
    expect(tile.myCourses.tag).toBe('article');
    expect(tile.myCourses.markup).toContain('className="catalog-actions"');
    expect(tile.myCourses.markup).toContain('attachment-list');
  });

  it('keeps the `.catalog-card p` rule the attachments line still needs', () => {
    // Removing the description did NOT make this rule dead: the dashboard card
    // still renders a `<p className="panel-muted">` for "no attachments yet",
    // and `.catalog-card p` is what gives it its size and colour.
    expect(myCourses).toContain('<p className="panel-muted">');
    expect(catalogCss).toMatch(/\.catalog-card p \{[^}]*font-size: var\(--fs-sm\);[^}]*\}/);
  });

  it('leaves the tile height floor to the shared card rule', () => {
    // The cards shrank on their own (249.78px against a 208px `min-height`),
    // so no per-grid override was needed — and none may creep in, or the
    // dashboard grid would drift from the public one.
    expect(catalogCss).not.toMatch(/\.catalog-card\s*\{[^}]*min-height:\s*0/);
    expect(catalogCss).not.toMatch(/\.catalog-actions\s*\{[^}]*margin-top:\s*auto/);
  });
});
