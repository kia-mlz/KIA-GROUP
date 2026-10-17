import { Injectable } from '@nestjs/common';
import type { LearnerProgressSummary } from '@kia./shared';
import { CoursesService } from '../../courses/courses/courses.service';
import { PrismaService } from '@kia./platform';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  async getSummary(userId: string): Promise<LearnerProgressSummary> {
    const [courses, exams, bootcamp, lessonProgress] = await Promise.all([
      this.coursesService.listMyCourses(userId),
      this.prisma.readinessTest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, average: true, passed: true, createdAt: true },
        take: 10,
      }),
      this.prisma.bootcampProfile.findUnique({
        where: { userId },
        select: { points: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, completed: true },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: {
          lesson: {
            select: {
              title: true,
              course: { select: { title: true, slug: true } },
            },
          },
        },
      }),
    ]);

    const examAverage = exams[0]?.average ?? null;
    const bootcampPoints = bootcamp?.points ?? 0;
    const courseCount = courses.length;
    const examCount = exams.length;
    const certificateCount = courses.filter((course) => course.progressPct >= 100).length;

    const courseAvg =
      courseCount > 0
        ? Math.round(courses.reduce((sum, c) => sum + c.progressPct, 0) / courseCount)
        : 0;
    const overallPct = Math.round(
      courseAvg * 0.6 + (examAverage ?? 0) * 0.25 + Math.min(100, bootcampPoints / 10) * 0.15,
    );

    const points = [
      ...courses.map((course) => ({
        label: course.title,
        value: course.progressPct,
        kind: 'course' as const,
      })),
      ...(examAverage != null
        ? [{ label: 'Readiness', value: examAverage, kind: 'exam' as const }]
        : []),
      {
        label: 'Bootcamp',
        value: Math.min(100, Math.round(bootcampPoints / 10)),
        kind: 'bootcamp' as const,
      },
    ];

    const activity = [
      ...lessonProgress.map((row) => ({
        id: `lesson-${row.id}`,
        text: `درس «${row.lesson.title}» از دوره «${row.lesson.course.title}» تکمیل شد`,
        createdAt: (row.completedAt ?? new Date()).toISOString(),
      })),
      ...exams.slice(0, 3).map((exam) => ({
        id: `exam-${exam.id}`,
        text: `آزمون آمادگی با نمره ${Math.round(exam.average)}٪ ${exam.passed ? 'قبول' : 'نیاز به تمرین'} شد`,
        createdAt: exam.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      courses: courses.map((course) => ({
        slug: course.slug,
        title: course.title,
        progressPct: course.progressPct,
      })),
      examAverage,
      bootcampPoints,
      points,
      overallPct,
      courseCount,
      examCount,
      certificateCount,
      activity,
    };
  }
}
