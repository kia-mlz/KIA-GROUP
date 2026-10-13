'use client';

import type { CourseSummary } from '@kia-group/shared';
import {
  BarChart3,
  BookOpen,
  Code2,
  Database,
  Gamepad2,
  Loader2,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CourseTileIcon } from '@/components/catalog/CourseTileIcon';
import { useLanguage } from '@/context/LanguageProvider';
import { trackMessageKey } from '@/i18n/domain';
import { api, ApiError } from '@/lib/api';
import { assignCardAccents, tintClass } from '@/lib/cardAccent';
import { localizeCourse } from '@/lib/courseLocalization';
import { courseDomains, coursesForTrack, OTHER_DOMAIN, STANDARD_DOMAIN_KEYS } from './domains';

/** One glyph per declared حوزه; custom admin keys fall back to the book mark. */
const DOMAIN_ICONS: Record<string, LucideIcon> = {
  web: Code2,
  backend: Database,
  data: BarChart3,
  ai: Sparkles,
  mobile: Smartphone,
  game: Gamepad2,
};

export function PublicCoursesPage() {
  const { t, locale } = useLanguage();
  // `?track=<key>` lists one domain, `?track=all` every course, and no param
  // (the catalog home) shows the حوزه‌ها as cards.
  const searchParams = useSearchParams();
  const rawTrack = searchParams.get('track');
  const track = rawTrack?.trim() || null;

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listCourses()
      .then(setCourses)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('courses.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const localizedCourses = useMemo(
    () => courses.map((course) => localizeCourse(course, locale)),
    [courses, locale],
  );
  const domains = useMemo(() => courseDomains(localizedCourses), [localizedCourses]);

  const visibleCourses = useMemo(
    () => coursesForTrack(localizedCourses, track),
    [localizedCourses, track],
  );
  // Each tile gets its own hue, stable across pages (see lib/cardAccent):
  // domains hue by their key, courses by their slug.
  const accents = useMemo(
    () =>
      assignCardAccents(
        track ? visibleCourses.map((course) => course.slug) : domains.map((domain) => domain.key),
      ),
    [track, visibleCourses, domains],
  );

  const domainLabel = (key: string) => {
    if (key === OTHER_DOMAIN) return t('publicCourses.domains.other');
    return STANDARD_DOMAIN_KEYS.includes(key) ? t(trackMessageKey(key)) : key;
  };

  if (loading) {
    return <div className="page-content auth-loading"><Loader2 size={24} className="spin" /> {t('courses.loading')}</div>;
  }

  if (!track) {
    return (
      <div className="page-content">
        <div className="container catalog-shell">
          <span className="eyebrow"><BookOpen size={14} className="inline-leading-icon" />{t('publicCourses.domains.eyebrow')}</span>
          <h1>{t('publicCourses.domains.title')}</h1>
          <p className="auth-sub">{t('publicCourses.domains.sub')}</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="catalog-grid catalog-grid--domains">
            {domains.map((domain, index) => {
              const label = domainLabel(domain.key);
              const Icon = DOMAIN_ICONS[domain.key] ?? BookOpen;
              // Every domain door is icon + title only; the course list behind
              // it carries the counts and the call to action.
              const tile = (
                <>
                  <span className="door-icon" aria-hidden="true"><Icon size={20} /></span>
                  <h2 className="door-title">{label}</h2>
                </>
              );
              const tint = tintClass(accents[index]);
              return domain.count > 0 ? (
                <Link
                  key={domain.key}
                  href={`/courses?track=${encodeURIComponent(domain.key)}`}
                  className={`door ${tint}`}
                >
                  {tile}
                </Link>
              ) : (
                <div key={domain.key} className={`door door--soon ${tint}`}>
                  {tile}
                </div>
              );
            })}
          </div>
          <div className="hub-actions">
            <Link href="/courses?track=all" className="btn btn--secondary">
              {t('publicCourses.domains.allCta', { count: localizedCourses.length })}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAll = track === 'all';

  return (
    <div className="page-content">
      <div className="container catalog-shell">
        <span className="eyebrow">
          <BookOpen size={14} className="inline-leading-icon" />
          {isAll ? t('publicCourses.eyebrow') : t('publicCourses.domains.eyebrow')}
        </span>
        <h1>{isAll ? t('publicCourses.title') : domainLabel(track)}</h1>
        <p className="auth-sub">{isAll ? t('publicCourses.sub') : t('publicCourses.domains.domainSub')}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <nav className="catalog-filters" aria-label={t('publicCourses.domains.title')}>
          <Link href="/courses" className="catalog-filter">{t('publicCourses.domains.back')}</Link>
          <Link
            href="/courses?track=all"
            className="catalog-filter"
            aria-current={isAll ? 'page' : undefined}
          >
            {t('publicCourses.domains.all')}
          </Link>
          {domains
            .filter((domain) => domain.count > 0 && domain.key !== OTHER_DOMAIN)
            .map((domain) => (
              <Link
                key={domain.key}
                href={`/courses?track=${encodeURIComponent(domain.key)}`}
                className="catalog-filter"
                aria-current={domain.key === track ? 'page' : undefined}
              >
                {domainLabel(domain.key)}
              </Link>
            ))}
        </nav>
        <div className="catalog-grid">
          {visibleCourses.map((course, index) => (
            <article key={course.id} className={`catalog-card ${tintClass(accents[index])}`}>
              <CourseTileIcon icon={course.icon} />
              <h3>
                {course.title}
                {course.comingSoon ? (
                  <span className="catalog-soon">{t('common.comingSoon')}</span>
                ) : null}
              </h3>
              <div className="catalog-meta">
                <span>{t('common.lessonsCount', { count: course.lessonCount })}</span>
                <span>{course.enrolled ? t('courses.status.unlocked') : t('publicCourses.available')}</span>
              </div>
              <div className="catalog-actions">
                <Link href={`/courses/${course.slug}`} className="btn btn--primary">{t('publicCourses.viewIntro')}</Link>
              </div>
            </article>
          ))}
        </div>
        {!error && visibleCourses.length === 0 ? (
          <p className="auth-sub">{t('publicCourses.domains.emptyDomain')}</p>
        ) : null}
      </div>
    </div>
  );
}
