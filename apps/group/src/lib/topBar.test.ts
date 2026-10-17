import { describe, expect, it } from 'vitest';
import { HOME_PATH } from './postLoginPath';
import { normalizePathname, showsTopBar } from './topBar';

/**
 * The site header rides on every page a registered learner can reach, with one
 * exception: `/home` is the departments hub and keeps the full screen. These
 * tests pin that exception as the *only* one — a route accidentally added to the
 * chromeless set (or a prefix test that swallowed `/homework`) would hide the
 * header on live pages.
 */

describe('showsTopBar', () => {
  it('leaves the departments hub bare', () => {
    expect(showsTopBar(HOME_PATH)).toBe(false);
    expect(HOME_PATH).toBe('/home');
  });

  it('normalizes a hand-typed trailing slash instead of slipping past the set', () => {
    expect(showsTopBar('/home/')).toBe(false);
    expect(showsTopBar('/home//')).toBe(false);
  });

  it('shows the bar on the learner panel, the catalog and the departments', () => {
    for (const path of [
      '/dashboard',
      '/dashboard/my-courses',
      '/courses',
      '/courses/javascript-basics',
      '/cart',
      '/checkout',
      '/tracks',
      '/tracks/technology',
      '/material',
      '/events',
      '/community',
      '/labs',
      '/freelance',
      '/learn/js-basics/what-is-js',
    ]) {
      expect(showsTopBar(path), path).toBe(true);
    }
  });

  it('is not a prefix test: a route that merely starts with the hub is not the hub', () => {
    expect(showsTopBar('/homework')).toBe(true);
    expect(showsTopBar('/homestead/1')).toBe(true);
  });

  it('draws the bar on the landing route too — the guest gate is the shell’s business', () => {
    // `SiteChrome` already withholds all chrome from guests, so this predicate
    // only answers "is this the hub"; keeping it unaware of auth keeps the two
    // rules from overlapping.
    expect(showsTopBar('/')).toBe(true);
    expect(showsTopBar(null)).toBe(true);
    expect(showsTopBar(undefined)).toBe(true);
    expect(showsTopBar('')).toBe(true);
  });
});

describe('normalizePathname', () => {
  it('maps the empty path to the root', () => {
    expect(normalizePathname(null)).toBe('/');
    expect(normalizePathname(undefined)).toBe('/');
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/')).toBe('/');
  });

  it('strips trailing slashes and surrounding space', () => {
    expect(normalizePathname('/home/')).toBe('/home');
    expect(normalizePathname(' /dashboard/// ')).toBe('/dashboard');
  });

  it('leaves interior slashes alone', () => {
    expect(normalizePathname('/dashboard/my-courses')).toBe('/dashboard/my-courses');
  });
});
