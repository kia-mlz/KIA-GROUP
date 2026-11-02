import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCourseCatalog, buildCourseDbEnOverlay, type CourseDbFile } from '../course-catalog';
import { EDUCATIONAL_GAME_TYPES } from '../types/educational-game';
import { buildCoverGameForLesson, pickCoverGameType } from './build-cover-game';

function loadDb(): CourseDbFile {
  const candidates = [
    join(__dirname, '../../../../db.json'),
    join(process.cwd(), 'db.json'),
    join(process.cwd(), '../../db.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as CourseDbFile;
    } catch {
      /* try next */
    }
  }
  throw new Error('db.json not found for educational-games coverage test');
}

describe('buildCoverGameForLesson', () => {
  it('creates one published multi-stage-capable game per catalog lesson with rotated types', () => {
    const catalog = buildCourseCatalog(loadDb(), buildCourseDbEnOverlay());
    const branding = [
      { slug: 'portfolio-story', title: 'Portfolio Story' },
      { slug: 'interview-framework', title: 'Interview Framework' },
    ];
    const all = [
      ...catalog.flatMap((course) =>
        course.lessons.map((lesson, lessonIndex) => ({
          courseSlug: course.slug,
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title,
          lessonIndex,
        })),
      ),
      ...branding.map((lesson, lessonIndex) => ({
        courseSlug: 'interview-branding',
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        lessonIndex,
      })),
    ];

    expect(all.length).toBeGreaterThan(200);

    const typesUsed = new Set<string>();
    for (const ref of all) {
      const game = buildCoverGameForLesson(ref);
      expect(game.slug).toBe('cover');
      expect(game.publishStatus).toBe('PUBLISHED');
      expect(game.title.length).toBeGreaterThan(3);
      expect(game.stages.length).toBeGreaterThan(0);
      expect(EDUCATIONAL_GAME_TYPES).toContain(game.type);
      typesUsed.add(game.type);
      for (const stage of game.stages) {
        expect(stage.challengeConfig).toBeTruthy();
        expect(stage.gradingConfig).toBeTruthy();
        expect((stage.gradingConfig as { strategy?: string }).strategy).toBeTruthy();
        expect(stage.mission.length).toBeGreaterThan(5);
      }
      expect(pickCoverGameType(ref.courseSlug, ref.lessonIndex)).toBe(game.type);
    }

    // Variety across the catalog — not a wall of quizzes.
    expect(typesUsed.size).toBeGreaterThanOrEqual(8);
  });
});
