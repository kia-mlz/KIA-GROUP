import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CourseSummary, LessonDetail, LessonSummary } from '@kia./shared';
import { isFreePreviewLessonIndex } from '@kia./shared';
import { MediaService } from '@kia./platform';
import { EventBusService } from '@kia./platform';
import { PrismaService } from '@kia./platform';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly events: EventBusService,
  ) {}

  async listCourses(userId?: string): Promise<CourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
        enrollments: userId ? { where: { userId } } : false,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const progressByCourse = userId
      ? await this.getProgressByCourse(userId, courses)
      : new Map<string, number>();

    return courses.map((course) => {
      const enrolled = Array.isArray(course.enrollments) && course.enrollments.length > 0;
      const lessonCount = course.lessons.length;
      const completedCount = progressByCourse.get(course.id) ?? 0;
      const progressPct = lessonCount === 0 ? 0 : Math.round((completedCount / lessonCount) * 100);

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        descriptionEn: course.descriptionEn,
        icon: course.icon,
        trackKey: course.trackKey,
        lessonCount,
        enrolled,
        progressPct,
        comingSoon: course.comingSoon,
      };
    });
  }

  async listMyCourses(userId: string): Promise<CourseSummary[]> {
    const courses = (await this.listCourses(userId)).filter((course) => course.enrolled);
    if (courses.length === 0) return courses;

    // Resume point per course: the next lesson after the last completed one, so
    // the UI can link straight into /learn/... (falls back to the first lesson).
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId: { in: courses.map((course) => course.id) } },
      orderBy: { sortOrder: 'asc' },
      select: { courseId: true, slug: true, id: true, comingSoon: true },
    });
    const completedIds = await this.getCompletedLessonIds(
      userId,
      lessons.map((lesson) => lesson.id),
    );

    const firstByCourseId = new Map<string, string>();
    for (const course of courses) {
      const ordered = lessons.filter(
        (lesson) => lesson.courseId === course.id && !lesson.comingSoon,
      );
      const resume = ordered.find((lesson) => !completedIds.has(lesson.id)) ?? ordered[0];
      if (resume) {
        firstByCourseId.set(course.id, resume.slug);
      }
    }

    return courses.map((course) => ({
      ...course,
      firstLessonSlug: firstByCourseId.get(course.id) ?? null,
    }));
  }

  async getCourse(
    userId: string | undefined,
    slug: string,
  ): Promise<CourseSummary & { lessons: LessonSummary[] }> {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
        enrollments: userId ? { where: { userId } } : false,
      },
    });

    if (!course || !course.published) {
      throw new NotFoundException(`Course ${slug} not found`);
    }

    const completedLessonIds = userId
      ? await this.getCompletedLessonIds(userId, course.lessons.map((lesson) => lesson.id))
      : new Set<string>();

    const lessons: LessonSummary[] = course.lessons.map((lesson, index) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      durationMin: lesson.durationMin,
      completed: completedLessonIds.has(lesson.id),
      hasVideo: Boolean(lesson.videoUrl),
      comingSoon: lesson.comingSoon,
      freePreview: isFreePreviewLessonIndex(index),
    }));

    const enrolled = Array.isArray(course.enrollments) && course.enrollments.length > 0;
    const progressPct =
      lessons.length === 0
        ? 0
        : Math.round((lessons.filter((lesson) => lesson.completed).length / lessons.length) * 100);

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      descriptionEn: course.descriptionEn,
      icon: course.icon,
      trackKey: course.trackKey,
      lessonCount: lessons.length,
      enrolled,
      progressPct,
      comingSoon: course.comingSoon,
      lessons,
    };
  }

  async getLesson(userId: string, courseSlug: string, lessonSlug: string): Promise<LessonDetail> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
        enrollments: { where: { userId } },
      },
    });

    if (!course || !course.published) {
      throw new NotFoundException(`Course ${courseSlug} not found`);
    }

    const lessonIndex = course.lessons.findIndex((lesson) => lesson.slug === lessonSlug);
    if (lessonIndex === -1) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }

    const lesson = course.lessons[lessonIndex];

    // Coming-soon lessons stay visible in listings but are locked — no content access.
    if (lesson.comingSoon || course.comingSoon) {
      throw new ForbiddenException('This course is coming soon');
    }

    // First N lessons are free to try without a course purchase.
    if (!isFreePreviewLessonIndex(lessonIndex)) {
      await this.assertCourseEntitlement(userId, course.slug);
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });

    // Navigation skips coming-soon lessons: they are shown but not enterable.
    const prevLesson = [...course.lessons.slice(0, lessonIndex)]
      .reverse()
      .find((entry) => !entry.comingSoon);
    const nextLesson = course.lessons
      .slice(lessonIndex + 1)
      .find((entry) => !entry.comingSoon);

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      durationMin: lesson.durationMin,
      completed: progress?.completed ?? false,
      hasVideo: Boolean(lesson.videoUrl),
      comingSoon: lesson.comingSoon,
      freePreview: isFreePreviewLessonIndex(lessonIndex),
      content: lesson.content,
      contentEn: lesson.contentEn,
      videoUrl: this.resolveVideoUrl(lesson.videoUrl, lesson.id, userId),
      courseSlug: course.slug,
      courseTitle: course.title,
      prevSlug: prevLesson?.slug ?? null,
      nextSlug: nextLesson?.slug ?? null,
    };
  }

  async enroll(userId: string, courseSlug: string): Promise<CourseSummary> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: { lessons: true },
    });

    if (!course || !course.published) {
      throw new NotFoundException(`Course ${courseSlug} not found`);
    }

    // Coming-soon courses are visible but not purchasable/enterable yet.
    if (course.comingSoon) {
      throw new ForbiddenException('This course is coming soon');
    }

    await this.assertCourseEntitlement(userId, courseSlug);

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }

    await this.prisma.enrollment.create({
      data: { userId, courseId: course.id },
    });

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      descriptionEn: course.descriptionEn,
      icon: course.icon,
      trackKey: course.trackKey,
      lessonCount: course.lessons.length,
      enrolled: true,
      progressPct: 0,
      comingSoon: course.comingSoon,
    };
  }

  async markComplete(
    userId: string,
    courseSlug: string,
    lessonSlug: string,
  ): Promise<LessonSummary> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
        enrollments: { where: { userId } },
      },
    });

    if (!course || !course.published) {
      throw new NotFoundException(`Course ${courseSlug} not found`);
    }

    const lessonIndex = course.lessons.findIndex((entry) => entry.slug === lessonSlug);
    const lesson = lessonIndex >= 0 ? course.lessons[lessonIndex] : undefined;
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }

    // Coming-soon lessons cannot be marked complete.
    if (lesson.comingSoon || course.comingSoon) {
      throw new ForbiddenException('This course is coming soon');
    }

    if (!isFreePreviewLessonIndex(lessonIndex)) {
      await this.assertCourseEntitlement(userId, course.slug);
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: {
        userId,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    // Domain event: Academy announces a 100% course completion so other
    // departments (notifications, events, community) can react without
    // importing Academy services. Computed only when the course has lessons.
    const [completedLessons, totalLessons] = await Promise.all([
      this.prisma.lessonProgress.count({
        where: { userId, lesson: { courseId: course.id }, completed: true },
      }),
      this.prisma.lesson.count({ where: { courseId: course.id, comingSoon: false } }),
    ]);
    if (totalLessons > 0 && completedLessons >= totalLessons) {
      await this.events
        .publish({
          name: 'academy.course.completed',
          occurredAt: new Date().toISOString(),
          userId,
          courseId: course.id,
          courseSlug: course.slug,
        })
        .catch(() => undefined);
    }

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      durationMin: lesson.durationMin,
      completed: progress.completed,
      comingSoon: lesson.comingSoon,
      freePreview: isFreePreviewLessonIndex(lessonIndex),
    };
  }

  private async assertCourseEntitlement(userId: string, courseSlug: string): Promise<void> {
    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        resourceType: 'course',
        resourceId: courseSlug,
      },
    });

    if (!entitlement) {
      throw new ForbiddenException('Purchase this course to access lessons');
    }
  }

  async listAttachments(userId: string, courseSlug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!course || !course.published) {
      throw new NotFoundException(`Course ${courseSlug} not found`);
    }

    await this.assertCourseEntitlement(userId, course.slug);

    return course.attachments.map((attachment) => ({
      id: attachment.id,
      title: attachment.title,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      sortOrder: attachment.sortOrder,
      createdAt: attachment.createdAt.toISOString(),
    }));
  }

  private async getCompletedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
    if (lessonIds.length === 0) {
      return new Set();
    }

    const progress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });

    return new Set(progress.map((entry) => entry.lessonId));
  }

  private async getProgressByCourse(
    userId: string,
    courses: Array<{ id: string; lessons: Array<{ id: string }> }>,
  ): Promise<Map<string, number>> {
    const lessonIds = courses.flatMap((course) => course.lessons.map((lesson) => lesson.id));

    if (lessonIds.length === 0) {
      return new Map();
    }

    const progress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });

    const completedSet = new Set(progress.map((entry) => entry.lessonId));
    const result = new Map<string, number>();

    for (const course of courses) {
      const completedCount = course.lessons.filter((lesson) => completedSet.has(lesson.id)).length;
      result.set(course.id, completedCount);
    }

    return result;
  }

  private resolveVideoUrl(
    videoUrl: string | null,
    lessonId: string,
    userId: string,
  ): string | null {
    if (!videoUrl) return null;
    const prefix = `/api/uploads/lessons/${lessonId}/`;
    if (!videoUrl.startsWith(prefix)) return videoUrl;
    const filename = videoUrl.slice(prefix.length);
    if (!filename) return videoUrl;
    return this.mediaService.createSignedVideoUrl(lessonId, filename, userId);
  }
}
