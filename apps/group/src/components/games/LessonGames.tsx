'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LessonGamesResponse } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';
import { gamesCopy } from './games-copy';

export function LessonGames({ courseSlug, lessonSlug }: { courseSlug: string; lessonSlug: string }) {
  const { locale } = useLanguage();
  const copy = gamesCopy(locale);
  const [data, setData] = useState<LessonGamesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .lessonGames(courseSlug, lessonSlug)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, lessonSlug]);

  if (!data) return null;
  return (
    <section className="eg-section glass-panel" aria-label={copy.sectionTitle}>
      <header>
        <h2>{copy.sectionTitle}</h2>
        <p className="muted">{copy.sectionHint}</p>
      </header>
      {data.games.length === 0 ? <p className="muted">{copy.empty}</p> : null}
      <div className="eg-grid">
        {data.games.map((game) => {
          const status = game.locked ? 'LOCKED' : game.progress.status;
          const label =
            status === 'COMPLETED' ? copy.replay : status === 'IN_PROGRESS' ? copy.continue : copy.start;
          return (
            <article key={game.id} className="eg-card">
              <div className="eg-card-top">
                <span className={`eg-status eg-status--${status.toLowerCase()}`}>{copy.status[status]}</span>
                <span>{game.required ? copy.required : copy.optional}</span>
              </div>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
              <p className="eg-goal"><span>{copy.goal}: </span>{game.learningGoal}</p>
              <ul className="eg-facts">
                <li>{copy.difficulty[game.difficulty]}</li>
                <li>{game.estimatedMin} {copy.minutes}</li>
                <li>{game.stageCount} {copy.stages}</li>
                <li>{game.points} {copy.points}</li>
              </ul>
              {game.locked ? (
                <p className="muted">{game.lockReason || copy.locked}</p>
              ) : (
                <Link className="pill-btn pill-btn--primary" href={`/learn/${courseSlug}/${lessonSlug}/play/${game.id}`}>
                  {label}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
