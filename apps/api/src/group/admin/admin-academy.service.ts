import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminCourse,
  AdminLesson,
  AuthUser,
} from '@kia./shared';
import { defaultExamBanks, genericExamQuestions } from '@kia./shared';
import { MediaStorageService, Prisma, PrismaService } from '@kia./platform';
import {
  AdminCreateCourseDto,
  AdminCreateLessonDto,
  AdminUpdateCourseDto,
  AdminUpdateLessonDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

/**
 * Kia Academy department — courses, lessons and lesson media.
 * Moved verbatim out of the former god-service; behaviour is unchanged.
 */
@Injectable()
export class AdminAcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
    private readonly audit: AdminAuditService,
  ) {}

  async listCourses(): Promise<AdminCourse[]> {
    const courses = await this.prisma.course.findMany({
      include: {
        lessons: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return courses.map((course) => this.toAdminCourse(course));
  }

  async createCourse(
    dto: AdminCreateCourseDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCourse> {
    const existing = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Course slug "${dto.slug}" already exists`);
    }

    const course = await this.prisma.course.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        descriptionEn: dto.descriptionEn?.trim() || null,
        icon: dto.icon ?? 'book',
        trackKey: dto.trackKey ?? null,
        sortOrder: dto.sortOrder ?? 0,
        published: dto.published ?? true,
        comingSoon: dto.comingSoon ?? false,
        lessons: dto.lessons?.length
          ? {
              create: dto.lessons.map((lesson, index) => ({
                slug: lesson.slug,
                title: lesson.title,
                content: lesson.content,
                contentEn: lesson.contentEn?.trim() || null,
                durationMin: lesson.durationMin ?? 10,
                sortOrder: lesson.sortOrder ?? index + 1,
                comingSoon: lesson.comingSoon ?? false,
              })),
            }
          : undefined,
      },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });

    // Default midterm + final exam for every new course.
    const anchorLesson = course.lessons[1] ?? course.lessons[0] ?? null;
    const bank = defaultExamBanks[dto.slug];
    const defaultExams = [
      {
        kind: 'MIDTERM' as const,
        title: `آزمون میان‌دوره ${course.title}`,
        description: 'سنجش نیمهٔ اول دوره — به‌صورت پیش‌فرض ساخته شد.',
        passScore: 50,
        sortOrder: 0,
        afterLessonId: anchorLesson?.id ?? null,
        questions: bank?.midterm ?? genericExamQuestions(course.title),
      },
      {
        kind: 'FINAL' as const,
        title: `آزمون نهایی ${course.title}`,
        description: 'پوشش کل دوره — به‌صورت پیش‌فرض ساخته شد.',
        passScore: 60,
        sortOrder: 1,
        afterLessonId: null,
        questions: bank?.final ?? genericExamQuestions(course.title),
      },
    ];
    for (const exam of defaultExams) {
      await this.prisma.courseExam.create({
        data: {
          courseId: course.id,
          title: exam.title,
          description: exam.description,
          passScore: exam.passScore,
          durationMin: 10,
          published: true,
          sortOrder: exam.sortOrder,
          kind: exam.kind,
          afterLessonId: exam.afterLessonId,
          questions: exam.questions as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await this.audit.record({
      actor,
      action: 'course.create',
      section: 'courses',
      entityType: 'Course',
      entityId: course.id,
      target: course.title,
      after: { slug: course.slug, lessonCount: course.lessons.length },
      ...requestMeta,
    });

    return this.toAdminCourse(course);
  }

  async updateCourse(
    slug: string,
    dto: AdminUpdateCourseDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCourse> {
    const course = await this.ensureCourseBySlug(slug);

    if (dto.slug && dto.slug !== course.slug) {
      const conflict = await this.prisma.course.findFirst({
        where: { slug: dto.slug, NOT: { id: course.id } },
      });
      if (conflict) {
        throw new ConflictException(`Course slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.course.update({
      where: { id: course.id },
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        descriptionEn: dto.descriptionEn?.trim() || null,
        icon: dto.icon,
        trackKey: dto.trackKey,
        sortOrder: dto.sortOrder,
        published: dto.published,
        comingSoon: dto.comingSoon,
      },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.audit.record({
      actor,
      action: 'course.update',
      section: 'courses',
      entityType: 'Course',
      entityId: course.id,
      target: updated.title,
      before: { slug: course.slug, published: course.published, comingSoon: course.comingSoon },
      after: { slug: updated.slug, published: updated.published, comingSoon: updated.comingSoon },
      ...requestMeta,
    });

    return this.toAdminCourse(updated);
  }

  async deleteCourse(
    slug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const course = await this.ensureCourseBySlug(slug);
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId: course.id },
      select: { id: true, videoUrl: true },
    });
    for (const lesson of lessons) {
      this.mediaStorage.deleteByPublicUrl(lesson.videoUrl);
      this.mediaStorage.clearLessonDir(lesson.id);
    }
    await this.prisma.course.delete({ where: { id: course.id } });
    await this.audit.record({
      actor,
      action: 'course.delete',
      section: 'courses',
      entityType: 'Course',
      entityId: course.id,
      target: course.title,
      before: { slug: course.slug, lessonCount: lessons.length },
      ...requestMeta,
    });
    return { deleted: true };
  }

  async createLesson(
    courseSlug: string,
    dto: AdminCreateLessonDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    const course = await this.ensureCourseBySlug(courseSlug);

    const conflict = await this.prisma.lesson.findFirst({
      where: { courseId: course.id, slug: dto.slug },
    });
    if (conflict) {
      throw new ConflictException(`Lesson slug "${dto.slug}" already exists in this course`);
    }

    const maxOrder = await this.prisma.lesson.aggregate({
      where: { courseId: course.id },
      _max: { sortOrder: true },
    });

    const lesson = await this.prisma.lesson.create({
      data: {
        courseId: course.id,
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        durationMin: dto.durationMin ?? 10,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        comingSoon: dto.comingSoon ?? false,
      },
    });

    await this.audit.record({
      actor,
      action: 'lesson.create',
      section: 'courses',
      entityType: 'Lesson',
      entityId: lesson.id,
      target: lesson.title,
      after: { slug: lesson.slug, courseId: course.id },
      ...requestMeta,
    });

    return this.toAdminLesson(lesson);
  }

  async updateLesson(
    courseSlug: string,
    lessonSlug: string,
    dto: AdminUpdateLessonDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId: course.id, slug: lessonSlug },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }

    if (dto.slug && dto.slug !== lesson.slug) {
      const conflict = await this.prisma.lesson.findFirst({
        where: { courseId: course.id, slug: dto.slug, NOT: { id: lesson.id } },
      });
      if (conflict) {
        throw new ConflictException(`Lesson slug "${dto.slug}" already exists in this course`);
      }
    }

    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        contentEn: dto.contentEn?.trim() || null,
        durationMin: dto.durationMin,
        sortOrder: dto.sortOrder,
        comingSoon: dto.comingSoon,
      },
    });

    await this.audit.record({
      actor,
      action: 'lesson.update',
      section: 'courses',
      entityType: 'Lesson',
      entityId: lesson.id,
      target: updated.title,
      before: { slug: lesson.slug, contentLength: lesson.content.length },
      after: { slug: updated.slug, contentLength: updated.content.length },
      ...requestMeta,
    });

    return this.toAdminLesson(updated);
  }

  async deleteLesson(
    courseSlug: string,
    lessonSlug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId: course.id, slug: lessonSlug },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }
    this.mediaStorage.deleteByPublicUrl(lesson.videoUrl);
    this.mediaStorage.clearLessonDir(lesson.id);
    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    await this.audit.record({
      actor,
      action: 'lesson.delete',
      section: 'courses',
      entityType: 'Lesson',
      entityId: lesson.id,
      target: lesson.title,
      before: { slug: lesson.slug, courseId: course.id },
      ...requestMeta,
    });
    return { deleted: true };
  }

  async uploadLessonVideo(
    courseSlug: string,
    lessonSlug: string,
    file: Express.Multer.File,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId: course.id, slug: lessonSlug },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }

    this.mediaStorage.deleteByPublicUrl(lesson.videoUrl);
    const videoUrl = this.mediaStorage.saveLessonVideo(lesson.id, file);
    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { videoUrl },
    });
    await this.audit.record({
      actor,
      action: 'lesson.video_upload',
      section: 'courses',
      entityType: 'Lesson',
      entityId: lesson.id,
      target: lesson.title,
      after: { fileName: file.originalname, sizeBytes: file.size, mimeType: file.mimetype },
      ...requestMeta,
    });
    return this.toAdminLesson(updated);
  }

  async deleteLessonVideo(
    courseSlug: string,
    lessonSlug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId: course.id, slug: lessonSlug },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonSlug} not found in course ${courseSlug}`);
    }

    this.mediaStorage.deleteByPublicUrl(lesson.videoUrl);
    this.mediaStorage.clearLessonDir(lesson.id);
    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { videoUrl: null },
    });
    await this.audit.record({
      actor,
      action: 'lesson.video_delete',
      section: 'courses',
      entityType: 'Lesson',
      entityId: lesson.id,
      target: lesson.title,
      ...requestMeta,
    });
    return this.toAdminLesson(updated);
  }

  private async ensureCourseBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course) {
      throw new NotFoundException(`Course ${slug} not found`);
    }
    return course;
  }

  private toAdminLesson(lesson: {
    id: string;
    slug: string;
    title: string;
    content: string;
    contentEn?: string | null;
    videoUrl?: string | null;
    durationMin: number;
    sortOrder: number;
    comingSoon?: boolean;
  }): AdminLesson {
    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      content: lesson.content,
      contentEn: lesson.contentEn ?? null,
      videoUrl: lesson.videoUrl ?? null,
      durationMin: lesson.durationMin,
      sortOrder: lesson.sortOrder,
      comingSoon: lesson.comingSoon ?? false,
    };
  }

  private toAdminCourse(course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    descriptionEn?: string | null;
    icon: string;
    trackKey: string | null;
    sortOrder: number;
    published: boolean;
    comingSoon?: boolean;
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      content: string;
      contentEn?: string | null;
      videoUrl?: string | null;
      durationMin: number;
      sortOrder: number;
    }>;
  }): AdminCourse {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      descriptionEn: course.descriptionEn ?? null,
      icon: course.icon,
      trackKey: course.trackKey,
      sortOrder: course.sortOrder,
      published: course.published,
      comingSoon: course.comingSoon ?? false,
      lessonCount: course.lessons.length,
      lessons: course.lessons.map((lesson) => this.toAdminLesson(lesson)),
    };
  }
}
