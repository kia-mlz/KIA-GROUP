import { ForbiddenException } from '@nestjs/common';
import { CoursesService } from './courses.service';

function buildLesson(overrides: {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  comingSoon?: boolean;
}) {
  return {
    id: overrides.id,
    slug: overrides.slug,
    title: overrides.title,
    durationMin: 10,
    content: `# ${overrides.title}`,
    contentEn: null,
    videoUrl: null,
    sortOrder: overrides.sortOrder,
    comingSoon: overrides.comingSoon ?? false,
  };
}

const FOUR_LESSONS = [
  buildLesson({ id: 'l0', slug: 'lesson-0', title: 'Lesson 0', sortOrder: 0 }),
  buildLesson({ id: 'l1', slug: 'lesson-1', title: 'Lesson 1', sortOrder: 1 }),
  buildLesson({ id: 'l2', slug: 'lesson-2', title: 'Lesson 2', sortOrder: 2 }),
  buildLesson({ id: 'l3', slug: 'lesson-3', title: 'Lesson 3', sortOrder: 3 }),
];

function makeService(opts?: { entitlement?: { id: string } | null }) {
  const prisma = {
    course: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        slug: 'js-core',
        title: 'JS Core',
        published: true,
        comingSoon: false,
        enrollments: [],
        lessons: FOUR_LESSONS,
      }),
    },
    lessonProgress: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ completed: true }),
      count: jest.fn().mockResolvedValue(1),
    },
    lesson: {
      count: jest.fn().mockResolvedValue(4),
    },
    entitlement: {
      findFirst: jest.fn().mockResolvedValue(opts?.entitlement ?? null),
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

  return { service, prisma };
}

describe('CoursesService lesson completion', () => {
  it('CoursesService.markComplete resolves lesson by course and lesson slug', async () => {
    const { service } = makeService({ entitlement: { id: 'ent-1' } });
    // Override course to the single-lesson shape used by the original test.
    const prismaCourse = (service as unknown as { prisma: { course: { findUnique: jest.Mock } } })
      .prisma.course;
    prismaCourse.findUnique.mockResolvedValue({
      id: 'c1',
      slug: 'js-core',
      published: true,
      comingSoon: false,
      enrollments: [{ id: 'e1' }],
      lessons: [
        {
          id: 'l1',
          slug: 'intro',
          title: 'Intro',
          durationMin: 10,
          comingSoon: false,
          sortOrder: 0,
        },
      ],
    });

    const result = await service.markComplete('user-1', 'js-core', 'intro');
    expect(result).toEqual({
      id: 'l1',
      slug: 'intro',
      title: 'Intro',
      durationMin: 10,
      completed: true,
      comingSoon: false,
      freePreview: true,
    });
  });
});

describe('CoursesService.getLesson free preview', () => {
  it('allows lesson indexes 0–2 without a course entitlement', async () => {
    const { service, prisma } = makeService({ entitlement: null });

    for (const slug of ['lesson-0', 'lesson-1', 'lesson-2'] as const) {
      prisma.entitlement.findFirst.mockClear();
      const detail = await service.getLesson('user-1', 'js-core', slug);
      expect(detail.slug).toBe(slug);
      expect(detail.freePreview).toBe(true);
      expect(prisma.entitlement.findFirst).not.toHaveBeenCalled();
    }
  });

  it('rejects lesson index 3+ without a course entitlement', async () => {
    const { service, prisma } = makeService({ entitlement: null });

    await expect(service.getLesson('user-1', 'js-core', 'lesson-3')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.entitlement.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        resourceType: 'course',
        resourceId: 'js-core',
      },
    });
  });

  it('allows lesson index 3+ when the user has a course entitlement', async () => {
    const { service } = makeService({ entitlement: { id: 'ent-1' } });

    const detail = await service.getLesson('user-1', 'js-core', 'lesson-3');
    expect(detail.slug).toBe('lesson-3');
    expect(detail.freePreview).toBe(false);
  });
});
