import { describe, expect, it } from 'vitest';
import { courseCatalog } from './courseCatalog';
import { STATIC_COURSE_LESSONS } from './staticPaths';
import {
  demoAdminGameStaticParams,
  demoAdminGamesDashboard,
  demoCourseGamesSummary,
  demoGameHint,
  demoLessonGames,
  demoPlayGameStaticParams,
  demoRestartGame,
  demoResumeGame,
  demoSubmitStage,
} from './demoGames';

describe('demo educational games', () => {
  it('covers every static lesson with a published playable game', () => {
    const params = demoPlayGameStaticParams();
    expect(params.length).toBe(STATIC_COURSE_LESSONS.length);
    expect(params.length).toBeGreaterThan(200);

    const keys = new Set(params.map((entry) => `${entry.courseSlug}::${entry.lessonSlug}`));
    for (const lesson of STATIC_COURSE_LESSONS) {
      expect(keys.has(`${lesson.courseSlug}::${lesson.lessonSlug}`)).toBe(true);
    }

    for (const entry of params) {
      expect(entry.courseSlug.length).toBeGreaterThan(0);
      expect(entry.lessonSlug.length).toBeGreaterThan(0);
      expect(entry.gameId.length).toBeGreaterThan(0);
      expect(entry.gameId).toBe(`demo-game-${entry.courseSlug}-${entry.lessonSlug}`);
      const listed = demoLessonGames(entry.courseSlug, entry.lessonSlug);
      expect(listed.games.map((game) => game.id)).toContain(entry.gameId);
    }

    expect(new Set(params.map((entry) => entry.gameId)).size).toBe(params.length);
    expect(demoAdminGameStaticParams().map((entry) => entry.id)).toEqual(
      params.map((entry) => entry.gameId),
    );
    expect(demoAdminGamesDashboard().lessonsWithoutGames).toEqual([]);
  });

  it('rotates game types across a course instead of only quizzes', () => {
    const html = demoCourseGamesSummary('html');
    const types = new Set(html.games.map((game) => game.type));
    expect(types.size).toBeGreaterThanOrEqual(6);
    expect(html.gameCount).toBe(courseCatalog.find((course) => course.slug === 'html')?.lessons.length);
  });

  it('lists a lesson game and grades a quiz stage without a live API', () => {
    const quizParam = demoPlayGameStaticParams().find((entry) => {
      const session = demoResumeGame(entry.gameId);
      return session.game.type === 'QUIZ';
    });
    expect(quizParam).toBeDefined();
    if (!quizParam) return;

    demoRestartGame(quizParam.gameId);
    const listed = demoLessonGames(quizParam.courseSlug, quizParam.lessonSlug);
    expect(listed.courseSlug).toBe(quizParam.courseSlug);
    expect(listed.lessonSlug).toBe(quizParam.lessonSlug);
    expect(listed.games.map((game) => game.id)).toContain(quizParam.gameId);
    expect(demoLessonGames(quizParam.courseSlug, 'not-a-lesson').games).toEqual([]);

    const summary = demoCourseGamesSummary(quizParam.courseSlug);
    expect(summary.games.some((game) => game.id === quizParam.gameId)).toBe(true);

    const session = demoResumeGame(quizParam.gameId);
    const stage = session.game.stages?.[0];
    expect(stage).toBeDefined();
    if (!stage) return;
    expect(session.game.courseSlug).toBe(quizParam.courseSlug);
    expect(session.game.lessonSlug).toBe(quizParam.lessonSlug);
    expect(session.alreadyCompleted).toBe(false);

    const options = (stage.challengeConfig.options as Array<{ id: string }> | undefined) ?? [];
    const correctId = options[0]?.id;
    expect(correctId).toBeTruthy();
    const wrongId = options.find((option) => option.id !== correctId)?.id ?? 'nope';

    // Grading config is server-shaped; pick the configured correct id when present.
    const grading = stage.challengeConfig as { prompt?: string };
    expect(grading.prompt?.length ?? 0).toBeGreaterThan(0);

    const wrong = demoSubmitStage(quizParam.gameId, stage.id, { selected: [wrongId] });
    // May pass if wrongId accidentally matches — force a nonsense id:
    const definitelyWrong = demoSubmitStage(quizParam.gameId, stage.id, { selected: ['__not_an_option__'] });
    expect(definitelyWrong.passed).toBe(false);
    expect(wrong.gameCompleted).toBe(false);

    const hint = demoGameHint(quizParam.gameId, stage.id, 0);
    expect(hint.hint.length).toBeGreaterThan(0);
    expect(hint.hintsRevealed).toBe(1);

    // Resume admin gradingConfig through submit by reading from resume again is not exposed;
    // submit with each option until one passes (single correct).
    let passed = false;
    for (const option of options) {
      demoRestartGame(quizParam.gameId);
      const result = demoSubmitStage(quizParam.gameId, stage.id, { selected: [option.id] });
      if (result.passed) {
        passed = true;
        expect(result.gameCompleted).toBe(true);
        expect(result.xpAwarded).toBeGreaterThan(0);
        expect(demoResumeGame(quizParam.gameId).alreadyCompleted).toBe(true);
        break;
      }
    }
    expect(passed).toBe(true);
  });
});
