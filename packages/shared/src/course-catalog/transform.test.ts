import { describe, expect, it } from 'vitest';
import {
  buildCourseCatalog,
  packLessonContent,
  parseLessonContent,
  type CourseDbFile,
} from './index';

const sampleDb: CourseDbFile = {
  courses: [
    {
      id: 1,
      title: 'HTML',
      description: 'Learn HTML',
      thumbnail_url: null,
      order_index: 1,
    },
  ],
  lessons: [
    {
      id: 10,
      course_id: 1,
      title: 'HTML HOME',
      description: 'Welcome',
      video_url: null,
      duration_minutes: 5,
      order_index: 1,
      playground: { language: 'html', html: '<h1>Hi</h1>' },
    },
  ],
};

describe('course-catalog', () => {
  it('builds catalog courses and lesson slugs from db.json shape', () => {
    const catalog = buildCourseCatalog(sampleDb);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]!.slug).toBe('html');
    expect(catalog[0]!.lessons).toHaveLength(1);
    expect(catalog[0]!.lessons[0]!.slug).toBe('html-home');
    expect(catalog[0]!.lessons[0]!.playground?.html).toBe('<h1>Hi</h1>');
    // Null video_url in db.json still gets a playable demo MP4 for the Learn player.
    expect(catalog[0]!.lessons[0]!.videoUrl).toMatch(/^https:\/\/storage\.googleapis\.com\//);
  });

  it('keeps an explicit video_url from db.json', () => {
    const withVideo: CourseDbFile = {
      ...sampleDb,
      lessons: [
        {
          ...sampleDb.lessons[0]!,
          video_url: 'https://example.com/lesson.mp4',
        },
      ],
    };
    const catalog = buildCourseCatalog(withVideo);
    expect(catalog[0]!.lessons[0]!.videoUrl).toBe('https://example.com/lesson.mp4');
  });

  it('round-trips playground through packed lesson content', () => {
    const packed = packLessonContent('Body', { language: 'css', css: 'body{}' });
    const parsed = parseLessonContent(packed);
    expect(parsed.markdown).toBe('Body');
    expect(parsed.playground?.css).toBe('body{}');
  });
});
