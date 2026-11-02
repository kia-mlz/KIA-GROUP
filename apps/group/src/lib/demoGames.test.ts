import { describe, expect, it } from 'vitest';
import { courseCatalog } from './courseCatalog';
import {
  demoAdminGameStaticParams,
  demoCourseGamesSummary,
  demoGameHint,
  demoLessonGames,
  demoPlayGameStaticParams,
  demoRestartGame,
  demoResumeGame,
  demoSubmitStage,
} from './demoGames';

describe('demo educational games', () => {
  it('returns one complete static param set per published game', () => {
    const params = demoPlayGameStaticParams();
    expect(params.length).toBeGreaterThan(0);
    for (const entry of params) {
      expect(entry.courseSlug.length).toBeGreaterThan(0);
      expect(entry.lessonSlug.length).toBeGreaterThan(0);
      expect(entry.gameId.length).toBeGreaterThan(0);
      const course = courseCatalog.find((item) => item.slug === entry.courseSlug);
      expect(course?.lessons.some((lesson) => lesson.slug === entry.lessonSlug)).toBe(true);
    }
    expect(new Set(params.map((entry) => entry.gameId)).size).toBe(params.length);
    expect(demoAdminGameStaticParams().map((entry) => entry.id)).toEqual(
      params.map((entry) => entry.gameId),
    );
  });

  it('lists the game on its lesson and plays the quiz without a live API', () => {
    const params = demoPlayGameStaticParams()[0];
    expect(params).toBeDefined();
    if (!params) return;
    demoRestartGame(params.gameId);
    const listed = demoLessonGames(params.courseSlug, params.lessonSlug);
    expect(listed.courseSlug).toBe(params.courseSlug);
    expect(listed.lessonSlug).toBe(params.lessonSlug);
    expect(listed.games.map((game) => game.id)).toContain(params.gameId);
    expect(demoLessonGames(params.courseSlug, 'not-a-lesson').games).toEqual([]);

    const summary = demoCourseGamesSummary(params.courseSlug);
    expect(summary.games.some((game) => game.id === params.gameId)).toBe(true);

    const session = demoResumeGame(params.gameId);
    const stage = session.game.stages?.[0];
    expect(stage).toBeDefined();
    if (!stage) return;
    expect(session.game.courseSlug).toBe(params.courseSlug);
    expect(session.game.lessonSlug).toBe(params.lessonSlug);
    expect(session.alreadyCompleted).toBe(false);

    const wrong = demoSubmitStage(params.gameId, stage.id, { selected: ['p'] });
    expect(wrong.passed).toBe(false);
    expect(wrong.gameCompleted).toBe(false);

    const hint = demoGameHint(params.gameId, stage.id, 0);
    expect(hint.hint.length).toBeGreaterThan(0);
    expect(hint.hintsRevealed).toBe(1);

    const right = demoSubmitStage(params.gameId, stage.id, { selected: ['h1'] });
    expect(right.passed).toBe(true);
    expect(right.gameCompleted).toBe(true);
    expect(right.xpAwarded).toBeGreaterThan(0);
    expect(demoResumeGame(params.gameId).alreadyCompleted).toBe(true);
  });
});
