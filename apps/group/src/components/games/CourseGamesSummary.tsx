'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CourseGamesSummary as Summary } from '@kia./shared';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';
import { gamesCopy } from './games-copy';

export function CourseGamesSummary({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const { locale } = useLanguage();
  const copy = gamesCopy(locale);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api
      .courseGamesSummary(slug)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isAuthenticated]);

  if (!isAuthenticated || !data || data.gameCount === 0) return null;
  return (
    <section className="eg-section" aria-label={copy.summary}>
      <h2>{copy.summary}</h2>
      <dl className="eg-metrics">
        <div><dt>{copy.gameCount}</dt><dd>{data.gameCount}</dd></div>
        <div><dt>{copy.completed}</dt><dd>{data.completed}</dd></div>
        <div><dt>{copy.remaining}</dt><dd>{data.remaining}</dd></div>
        <div><dt>{copy.xp}</dt><dd>{data.xpEarned}</dd></div>
        <div><dt>{copy.level}</dt><dd>{data.level}</dd></div>
        <div><dt>{copy.streak}</dt><dd>{data.streakDays}</dd></div>
      </dl>
      <div className="eg-bar" aria-hidden="true"><span style={{ width: `${data.progressPct}%` }} /></div>
      <ul className="eg-course-list">
        {data.games.map((game) => (
          <li key={game.id}>
            <div>
              <strong>{game.title}</strong>
              <span>{game.lessonTitle}</span>
            </div>
            <span>{copy.status[game.status] ?? game.status}</span>
            <span>{copy.difficulty[game.difficulty]}</span>
            <span>{game.estimatedMin} {copy.minutes}</span>
            <span>{game.points} {copy.points}</span>
            {game.locked ? null : (
              <Link href={`/learn/${slug}/${game.lessonSlug}`}>{copy.continue}</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
