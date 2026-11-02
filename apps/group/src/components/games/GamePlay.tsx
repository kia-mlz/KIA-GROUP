'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { GamePlaySession, GameSubmitResult, LearnerGameStage } from '@kia./shared';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { GameActivity } from './Activities';
import { gamesCopy } from './games-copy';

export default function GamePlay({ gameId }: { gameId: string }) {
  const pathname = usePathname();
  const nextPath = pathname || `/learn/play/${gameId}`;
  return (
    <RequireAuth nextPath={nextPath} learnerFlow>
      <GamePlayInner gameId={gameId} />
    </RequireAuth>
  );
}

function GamePlayInner({ gameId }: { gameId: string }) {
  const { locale } = useLanguage();
  const copy = gamesCopy(locale);
  const [session, setSession] = useState<GamePlaySession | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<unknown>(null);
  const [result, setResult] = useState<GameSubmitResult | null>(null);
  const [hint, setHint] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .resumeGame(gameId)
      .then((next) => {
        if (cancelled) return;
        setSession(next);
        setDone(next.alreadyCompleted);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : copy.loading);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, copy.loading]);

  const stages = session?.game.stages ?? [];
  const completed = new Set(session?.game.progress.completedStageIds ?? []);
  const current = useMemo(() => {
    if (done) return null;
    return stages.find((stage) => !completed.has(stage.id)) ?? null;
  }, [stages, session?.game.progress.completedStageIds, done]);

  const index = current ? stages.findIndex((stage) => stage.id === current.id) : stages.length;
  const progressPct = stages.length ? Math.round((Math.min(index, stages.length) / stages.length) * 100) : 0;

  const submit = async () => {
    if (!current || !session) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.submitStage(session.game.id, current.id, answer ?? {});
      setResult(next);
      setSession((prev) =>
        prev
          ? { ...prev, game: { ...prev.game, progress: next.progress }, alreadyCompleted: next.gameCompleted }
          : prev,
      );
      if (next.gameCompleted) setDone(true);
      else if (next.passed) setAnswer(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.loading);
    } finally {
      setBusy(false);
    }
  };

  const revealHint = async () => {
    if (!current || !session) return;
    const revealed = current.hintsRevealed;
    try {
      const next = await api.gameHint(session.game.id, current.id, revealed);
      setHint(next.hint);
      setSession((prev) => {
        if (!prev?.game.stages) return prev;
        return {
          ...prev,
          game: {
            ...prev.game,
            stages: prev.game.stages.map((stage) =>
              stage.id === current.id ? { ...stage, hintsRevealed: next.hintsRevealed } : stage,
            ),
          },
        };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.hint);
    }
  };

  const replay = async () => {
    setBusy(true);
    setResult(null);
    setHint('');
    setAnswer(null);
    setDone(false);
    try {
      const next = await api.restartGame(gameId);
      setSession(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.replay);
    } finally {
      setBusy(false);
    }
  };

  if (!session && !error) {
    return <div className="page-content eg-play"><p>{copy.loading}</p></div>;
  }
  if (!session) {
    return <div className="page-content eg-play"><p className="form-error">{error}</p></div>;
  }

  const summary = result?.result;
  if (done) {
    const progress = session.game.progress;
    const accuracy = summary?.accuracy ?? (progress.gradedCount ? Math.round((progress.correctCount / progress.gradedCount) * 100) : 0);
    return (
      <div className="page-content">
        <section className="eg-play eg-complete">
          <p className="eg-kicker">{session.game.courseTitle}</p>
          <h1>{copy.success}</h1>
          <p>{session.game.title}</p>
          <dl className="eg-metrics">
            <div><dt>{copy.score}</dt><dd>{summary?.score ?? progress.score}</dd></div>
            <div><dt>{copy.time}</dt><dd>{formatSeconds(summary?.timeSpentSec ?? progress.timeSpentSec)}</dd></div>
            <div><dt>{copy.attempts}</dt><dd>{summary?.attempts ?? progress.attemptsCount}</dd></div>
            <div><dt>{copy.stages}</dt><dd>{summary?.stagesCompleted ?? progress.completedStageIds.length}</dd></div>
            <div><dt>{copy.accuracy}</dt><dd>{accuracy}%</dd></div>
            <div><dt>{copy.xp}</dt><dd>{result?.xpAwarded ?? 0}</dd></div>
          </dl>
          <div>
            <h2>{copy.badges}</h2>
            {(summary?.badges.length ?? 0) > 0 ? (
              <ul className="eg-badges">
                {summary?.badges.map((badge) => (
                  <li key={badge.key}><strong>{badge.title}</strong><span>{badge.description}</span></li>
                ))}
              </ul>
            ) : (
              <p className="muted">{copy.noBadges}</p>
            )}
          </div>
          <div className="eg-row">
            <button type="button" className="pill-btn" onClick={() => void replay()} disabled={busy}>{copy.replay}</button>
            <Link className="pill-btn" href={`/learn/${session.game.courseSlug}/${session.game.lessonSlug}`}>{copy.back}</Link>
            {session.game.nextLessonSlug ? (
              <Link className="pill-btn pill-btn--primary" href={`/learn/${session.game.courseSlug}/${session.game.nextLessonSlug}`}>
                {copy.nextLesson}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content">
      <section className="eg-play">
        <header className="eg-head">
          <div>
            <p className="eg-kicker">{session.game.lessonTitle}</p>
            <h1>{session.game.title}</h1>
          </div>
          <div className="eg-score">
            <span>{copy.score}</span>
            <strong>{session.game.progress.score}</strong>
          </div>
        </header>
        <div className="eg-bar" aria-hidden="true"><span style={{ width: `${progressPct}%` }} /></div>
        <p className="eg-meta">
          {copy.stage} {Math.min(index + 1, stages.length)} / {stages.length}
          {' · '}
          {copy.difficulty[session.game.difficulty]}
        </p>
        {current ? <StageBody stage={current} copy={copy} gameType={session.game.type} answer={answer} setAnswer={setAnswer} hint={hint} result={result} /> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {result && !result.gameCompleted ? (
          <p className={result.passed ? 'eg-ok' : 'eg-bad'} role="status">{result.feedback}</p>
        ) : null}
        <div className="eg-row">
          <button type="button" className="pill-btn pill-btn--primary" disabled={busy || !current} onClick={() => void submit()}>
            {copy.check}
          </button>
          <button
            type="button"
            className="pill-btn"
            disabled={!current || current.hintsRevealed >= current.hintsAvailable}
            onClick={() => void revealHint()}
          >
            {copy.hint}
          </button>
          <button type="button" className="pill-btn" onClick={() => { setAnswer(null); setResult(null); }}>
            {copy.retry}
          </button>
          <Link className="pill-btn" href={`/learn/${session.game.courseSlug}/${session.game.lessonSlug}`}>{copy.back}</Link>
        </div>
      </section>
    </div>
  );
}

function StageBody({
  stage,
  copy,
  gameType,
  answer,
  setAnswer,
  hint,
  result,
}: {
  stage: LearnerGameStage;
  copy: ReturnType<typeof gamesCopy>;
  gameType: string;
  answer: unknown;
  setAnswer: (value: unknown) => void;
  hint: string;
  result: GameSubmitResult | null;
}) {
  return (
    <div className="eg-stage">
      <p className="eg-kicker">{copy.mission}</p>
      <h2>{stage.title}</h2>
      <p>{stage.mission || stage.description}</p>
      <GameActivity
        stage={stage}
        gameType={gameType}
        answer={answer}
        onChange={setAnswer}
        disabled={Boolean(result?.passed)}
        pythonNote={copy.pythonNote}
        runLabel={copy.run}
        resetLabel={copy.reset}
        previewLabel={copy.preview}
      />
      {hint ? <p className="eg-hint">{hint}</p> : null}
    </div>
  );
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
