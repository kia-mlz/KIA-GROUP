import { CoursesService } from './courses.service';

describe('CoursesService lesson completion', () => {
  it('CoursesService.markComplete resolves lesson by course and lesson slug', async () => {
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          slug: 'js-core',
          published: true,
          enrollments: [{ id: 'e1' }],
          lessons: [
            {
              id: 'l1',
              slug: 'intro',
              title: 'Intro',
              durationMin: 10,
            },
          ],
        }),
      },
      lessonProgress: {
        upsert: jest.fn().mockResolvedValue({ completed: true }),
        count: jest.fn().mockResolvedValue(1),
      },
      lesson: {
        count: jest.fn().mockResolvedValue(1),
      },
      entitlement: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ent-1' }),
      },
    };

    const mediaService = {
      createSignedVideoUrl: jest.fn(),
    };

    const service = new CoursesService(
      prisma as never,
      mediaService as never,
      { publish: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const result = await service.markComplete('user-1', 'js-core', 'intro');
    expect(result).toEqual({
      id: 'l1',
      slug: 'intro',
      title: 'Intro',
      durationMin: 10,
      completed: true,
    });
  });
});
