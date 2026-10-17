'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import type { DepartmentSlug } from '@/components/brand/departments';
import { useLanguage } from '@/context/LanguageProvider';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * The kia. departments as a solar system — the hub UI for `/home` and the
 * top of the dashboard (it replaces the old door grid, UX-29/30).
 *
 * kia. is the sun (the brand mark on gold); each department is a planet
 * on its own orbit ring, swept by a comet pulse. The planets keep the exact
 * routes and translation keys the door grid used (via the `DEPARTMENTS`
 * registry), so navigation, i18n and the rail all behave exactly as before —
 * only the presentation changed, per the approved mock.
 *
 * Ordering feedback: orbits progress small → large. The orbit carrying the
 * smallest planet is first (orbit 1) and the orbit with the largest planet is
 * last (orbit 6), so planet sizes ascend with the orbit index alongside the
 * ring diameters.
 *
 * Colour discipline (unchanged): the sun is kia. itself — gold rim, gold
 * mark, `var(--group-gold)` only on the sun. Every planet, ring and pulse
 * derives from its own `var(--dept-<slug>)` token through the `dept--<slug>`
 * class, so the brand package stays the single source of truth and a recolour
 * can never drift this diagram away from the department pages.
 *
 * Geometry note: each planet centre sits exactly on its orbit circle
 * (√(dx² + dy²) = orbit radius for all six), so the rings and planets never
 * disagree.
 */
interface Planet {
  /** 1-based orbit index — drives `solar__orbit--N` / `solar__pulse--N` CSS. */
  readonly orbit: 1 | 2 | 3 | 4 | 5 | 6;
  readonly slug: DepartmentSlug;
  readonly href: string;
  /** Full department name — aria-label and hover title. */
  readonly titleKey: string;
  /** Single-word label that fits on the planet. */
  readonly shortKey: string;
  /** Orbit ring diameter, % of the square stage. */
  readonly orbitSize: string;
  /** Planet diameter, % of the square stage. */
  readonly planetSize: string;
  /** Planet centre on the orbit circle, % of the stage. */
  readonly top: string;
  readonly left: string;
}

/*
 * Ordered small → large by planet size: labs (7.5%) → work (9%) → events
 * (10%) → academy (12%) → material (13%) → community (14%). Each centre lies
 * on its own ring (left/top derived from a distinct angle θ:
 * left = 50 + r·cos θ, top = 50 + r·sin θ, r = orbitSize / 2).
 */
const PLANETS: readonly Planet[] = [
  {
    orbit: 1,
    slug: 'labs',
    href: '/labs',
    titleKey: 'dashboard.doors.labsTitle',
    shortKey: 'dashboard.doors.labsShort',
    orbitSize: '36%',
    planetSize: '7.5%',
    top: '56.16%',
    left: '66.91%',
  },
  {
    orbit: 2,
    slug: 'work',
    href: '/freelance',
    titleKey: 'dashboard.doors.workTitle',
    shortKey: 'dashboard.doors.workShort',
    orbitSize: '46%',
    planetSize: '9%',
    top: '72.91%',
    left: '48.00%',
  },
  {
    orbit: 3,
    slug: 'events',
    href: '/events',
    titleKey: 'dashboard.doors.eventsTitle',
    shortKey: 'dashboard.doors.eventsShort',
    orbitSize: '56%',
    planetSize: '10%',
    top: '59.58%',
    left: '23.69%',
  },
  {
    orbit: 4,
    slug: 'academy',
    href: '/tracks',
    titleKey: 'dashboard.doors.academyTitle',
    shortKey: 'dashboard.doors.academyShort',
    orbitSize: '66%',
    planetSize: '12%',
    top: '31.07%',
    left: '22.97%',
  },
  {
    orbit: 5,
    slug: 'material',
    href: '/material',
    titleKey: 'dashboard.doors.materialTitle',
    shortKey: 'dashboard.doors.materialShort',
    orbitSize: '76%',
    planetSize: '13%',
    top: '13.30%',
    left: '59.83%',
  },
  {
    orbit: 6,
    slug: 'community',
    href: '/community',
    titleKey: 'dashboard.doors.communityTitle',
    shortKey: 'dashboard.doors.communityShort',
    orbitSize: '86%',
    planetSize: '14%',
    top: '28.50%',
    left: '87.24%',
  },
] as const;

export function DepartmentSolarSystem({
  showHeading = true,
}: {
  showHeading?: boolean;
}) {
  const { t } = useLanguage();

  // The group name sits last in Persian and first in English, so the single
  // translated phrase is split around `common.brand` instead of storing the
  // halves as separate keys (which cannot express "no lead word" — the
  // translator treats an empty string as missing and falls back to English).
  const heading = t('dashboard.doors.heading');
  const brand = t('common.brand');
  const at = heading.indexOf(brand);

  return (
    <section className="dash-doors dash-doors--solar" aria-label={heading}>
      {showHeading ? (
        <h2 className="dash-doors__heading">
          {at < 0 ? (
            heading
          ) : (
            <>
              {heading.slice(0, at)}
              <span className="dash-doors__brand">{brand}</span>
              {heading.slice(at + brand.length)}
            </>
          )}
        </h2>
      ) : null}

      <p className="solar__sub">{t('dashboard.doors.orbitsSub')}</p>

      <div className="solar__stage">
        {/* The sun — kia. itself, rendered as the brand mark on gold. */}
        <div className="solar__sun" aria-hidden="true">
          <BrandMark className="solar__sun-mark" />
        </div>

        {PLANETS.map((planet) => (
          <Fragment key={planet.slug}>
            <div
              className={`solar__orbit solar__orbit--${planet.orbit}`}
              aria-hidden="true"
              style={{ width: planet.orbitSize, height: planet.orbitSize }}
            />
            <div
              className={`solar__pulse solar__pulse--${planet.orbit}`}
              aria-hidden="true"
              style={{ width: planet.orbitSize, height: planet.orbitSize }}
            >
              <span className="solar__pulse-marker">
                <span className="solar__pulse-head" />
                <span className="solar__pulse-tail" />
              </span>
            </div>
            <Link
              href={planet.href}
              className={`solar__planet solar__planet--${planet.slug} dept--${planet.slug}`}
              style={{
                top: planet.top,
                left: planet.left,
                width: planet.planetSize,
                height: planet.planetSize,
              }}
              aria-label={t(planet.titleKey)}
              title={t(planet.titleKey)}
            >
              <span className="solar__label">{t(planet.shortKey)}</span>
            </Link>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
