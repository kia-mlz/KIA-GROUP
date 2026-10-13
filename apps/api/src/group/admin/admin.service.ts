import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  AdminChallenge,
  AdminCompetition,
  AdminCompetitionRegistration,
  AdminContactMessage,
  AdminCourse,
  AdminEntitlement,
  AdminLesson,
  AdminLearnerMessage,
  AdminOrder,
  AdminPayment,
  AdminRole,
  AdminStats,
  AdminTicketDetail,
  AdminTicketSummary,
  AdminUser,
  AdminUserList,
  AdminUserListParams,
  AdminWalletDetail,
  AdminWalletSummary,
  AuthUser,
  SiteAdminAccessSettings,
} from '@kia-group/shared';
import {
  defaultExamBanks,
  genericExamQuestions,
  normalizeAdminAccess,
  normalizeIranianPhone,
} from '@kia-group/shared';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { MediaStorageService } from '@kia-group/platform';
import { PrismaService } from '@kia-group/platform';
import { SiteSettingsService } from '@kia-group/platform';
import {
  AdminAdjustWalletDto,
  AdminCreateChallengeDto,
  AdminCreateCompetitionDto,
  AdminCreateCourseDto,
  AdminCreateLessonDto,
  AdminCreateRoleDto,
  AdminCreateUserDto,
  AdminGrantEntitlementDto,
  AdminReplyTicketDto,
  AdminSendMessageDto,
  AdminUpdateChallengeDto,
  AdminUpdateCompetitionDto,
  AdminUpdateCourseDto,
  AdminUpdateLessonDto,
  AdminUpdateRoleDto,
  AdminUpdateTicketDto,
  AdminUpdateUserAccessDto,
    AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
  RefundPaymentDto,
} from './dto/admin.dto';
import { AdminAuditService } from './audit.service';
import { PaymentsService } from '../commerce/payments/payments.service';
import { Prisma, EntitlementResourceType } from '@kia-group/platform';

const BCRYPT_ROUNDS = 12;

/** Per-request metadata captured by the controller for audit logging. */
export interface AdminRequestMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Valid account statuses for admin-managed users. */
const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Legacy admin-form resource-type labels mapped onto the canonical DB enum
 * (DB-2). The enum now enforces the exact vocabulary the learner-side
 * entitlement checks (`course:…`, `roadmap:…`, `readiness:…`) rely on, so
 * grants written as `readiness_test`/`roadmap_bundle` are normalized at the
 * boundary — previously they were stored verbatim and never matched a
 * learner check.
 */
function toResourceType(value: string): EntitlementResourceType {
  if (value === 'readiness_test') return 'readiness';
  if (value === 'roadmap_bundle') return 'roadmap';
  if (value === 'course' || value === 'roadmap' || value === 'readiness') {
    return value;
  }
  throw new BadRequestException(`Invalid resourceType "${value}"`);
}

const SYSTEM_ROLE_DEFS = [
  { key: 'LEARNER', isSystem: true },
  { key: 'ADMIN', isSystem: true },
  { key: 'SUPER_ADMIN', isSystem: true },
] as const;

/** Custom roles are moderator-like: panel access is decided by their access matrix. */
const isStaffRole = (role: string): boolean =>
  role === 'ADMIN' || (role !== 'LEARNER' && role !== 'SUPER_ADMIN');

function toJsonAccess(value: SiteAdminAccessSettings): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class AdminService {
     constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
    private readonly siteSettings: SiteSettingsService,
    private readonly audit: AdminAuditService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const [users, courses, lessons, challenges, activeChallenges, payments, enrollments, revenue] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.course.count(),
        this.prisma.lesson.count(),
        this.prisma.challenge.count(),
        this.prisma.challenge.count({ where: { active: true } }),
        this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
        this.prisma.enrollment.count(),
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amountCents: true },
        }),
      ]);

    return {
      users,
      courses,
      lessons,
      enrollments,
      payments,
      revenueCents: revenue._sum.amountCents ?? 0,
      challenges,
      activeChallenges,
    };
  }

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

  async listChallenges(): Promise<AdminChallenge[]> {
    const challenges = await this.prisma.challenge.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return challenges.map((challenge) => this.toAdminChallenge(challenge));
  }

  async createChallenge(
    dto: AdminCreateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    const existing = await this.prisma.challenge.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Challenge slug "${dto.slug}" already exists`);
    }

    const challenge = await this.prisma.challenge.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        points: dto.points ?? 120,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        active: dto.active ?? true,
        starterCode: dto.starterCode ?? '',
      },
    });

    await this.audit.record({
      actor,
      action: 'challenge.create',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: challenge.title,
      after: { slug: challenge.slug, points: challenge.points },
      ...requestMeta,
    });

    return this.toAdminChallenge(challenge);
  }

  async updateChallenge(
    slug: string,
    dto: AdminUpdateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    const challenge = await this.ensureChallengeBySlug(slug);

    if (dto.slug && dto.slug !== challenge.slug) {
      const conflict = await this.prisma.challenge.findFirst({
        where: { slug: dto.slug, NOT: { id: challenge.id } },
      });
      if (conflict) {
        throw new ConflictException(`Challenge slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        points: dto.points,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active,
        starterCode: dto.starterCode,
      },
    });

    await this.audit.record({
      actor,
      action: 'challenge.update',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: updated.title,
      before: { slug: challenge.slug, active: challenge.active, points: challenge.points },
      after: { slug: updated.slug, active: updated.active, points: updated.points },
      ...requestMeta,
    });

    return this.toAdminChallenge(updated);
  }

  async deleteChallenge(
    slug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const challenge = await this.ensureChallengeBySlug(slug);
    await this.prisma.challenge.delete({ where: { id: challenge.id } });
    await this.audit.record({
      actor,
      action: 'challenge.delete',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: challenge.title,
      before: { slug: challenge.slug },
      ...requestMeta,
    });
    return { deleted: true };
  }

  async listUsers(params: AdminUserListParams): Promise<AdminUserList> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));

    const where: Prisma.UserWhereInput = {};
    // DB-4: soft-deleted accounts are hidden by default. The deleted/all views
    // exist so a mistaken deletion can be found and reversed — without them the
    // restore endpoint had no reachable target.
    const deletedView = params.deleted ?? 'active';
    if (deletedView === 'deleted') {
      where.deletedAt = { not: null };
    } else if (deletedView !== 'all') {
      where.deletedAt = null;
    }
    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (params.role) {
      where.role = params.role;
    }
    if (params.status) {
      where.status = params.status;
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          deletedAt: true,
          adminPanelAccess: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: users.map((user) => this.toAdminUser(user)),
      total,
      page,
      limit,
      hasNext: page * limit < total,
    };
  }

  /**
   * Activate / suspend / ban a user account.
   *
   * Rules enforced server-side:
   * - Cannot change your own status (no accidental self-lockout).
   * - SUPER_ADMIN accounts can never be suspended or banned.
   * - Moderators may only manage LEARNER accounts; staff accounts require a super admin.
   * - Suspending/banning requires a reason and revokes all refresh tokens (force logout).
   */
  async updateUserStatus(
    id: string,
    dto: AdminUpdateUserStatusDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    if (!USER_STATUSES.includes(dto.status as UserStatus)) {
      throw new BadRequestException(`Invalid status "${dto.status}"`);
    }
    const target = (dto.status === 'ACTIVE' ? 'ACTIVE' : dto.status) as UserStatus;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (user.id === actor.id) {
      throw new BadRequestException('You cannot change your own account status');
    }
    if (user.role === 'SUPER_ADMIN' && target !== 'ACTIVE') {
      throw new BadRequestException('Super admin accounts cannot be suspended or banned');
    }
    if (actor.role !== 'SUPER_ADMIN' && user.role !== 'LEARNER') {
      throw new ForbiddenException('Only super admins can change staff account status');
    }

    const reason = dto.reason?.trim() ?? '';
    if (target !== 'ACTIVE' && !reason) {
      throw new BadRequestException('A reason is required when suspending or banning a user');
    }
    if (user.status === target) {
      return this.toAdminUser(user);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id },
        data:
          target === 'ACTIVE'
            ? { status: 'ACTIVE', suspendedAt: null, suspendedReason: null }
            : {
                status: target,
                suspendedAt: new Date(),
                suspendedReason: reason,
              },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          adminPanelAccess: true,
          suspendedReason: true,
        },
      });
      // Force logout: suspended/banned users lose every active session immediately.
      if (target !== 'ACTIVE') {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }
      return row;
    });

    await this.audit.record({
      actor,
      action: 'user.status_change',
      section: 'users',
      entityType: 'User',
      entityId: id,
      target: updated.email ?? updated.name,
      before: { status: user.status },
      after: { status: updated.status, suspendedReason: updated.suspendedReason },
      reason: reason || null,
      ...requestMeta,
    });

    return this.toAdminUser(updated);
  }

  /**
   * DB-4 soft delete: anonymize + deactivate the account while keeping the
   * row (and its financial history, protected by the Restrict FKs on
   * Order/Payment) intact for audit and reversal.
   *
   * Rules enforced server-side:
   * - SUPER_ADMIN only.
   * - Cannot soft-delete yourself or the last super admin.
   * - Staff accounts require super-admin (implicit — route is SUPER_ADMIN only).
   * - All refresh tokens revoked (force logout everywhere).
   * - PII fields cleared; identity hash retained for audit correlation.
   */
  async softDeleteUser(
    id: string,
    reason: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can soft-delete accounts');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (user.id === actor.id) {
      throw new BadRequestException('You cannot soft-delete your own account');
    }
    if (user.deletedAt) {
      throw new ConflictException('User is already soft-deleted');
    }
    if (user.role === 'SUPER_ADMIN') {
      const superCount = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', deletedAt: null },
      });
      if (superCount <= 1) {
        throw new ForbiddenException('Cannot soft-delete the last super admin');
      }
    }

    const deletedAt = new Date();
    // Deterministic identity hash (not reversible) so audit trails and financial
    // rows keep a stable correlation key after PII is cleared.
    const identityHash = createHash('sha256')
      .update(`kia-academy:user:${user.id}`)
      .digest('hex')
      .slice(0, 16);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Force logout everywhere first.
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      return tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt,
          status: 'BANNED',
          suspendedAt: deletedAt,
          suspendedReason: `soft-delete: ${reason}`.slice(0, 500),
          // PII minimization — the account is no longer reachable or identifiable.
          name: identityHash,
          firstName: null,
          lastName: null,
          email: null,
          phone: null,
          bio: null,
          avatarUrl: null,
          province: null,
          city: null,
          passwordHash: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          profileComplete: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          adminPanelAccess: true,
        },
      });
    });

    await this.audit.record({
      actor,
      action: 'user.soft_delete',
      section: 'users',
      entityType: 'User',
      entityId: user.id,
      target: user.email ?? user.name,
      ...requestMeta,
      reason: reason.slice(0, 500),
      before: {
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      after: {
        deletedAt: deletedAt.toISOString(),
        identityHash,
        status: 'BANNED',
      },
    });

    return this.toAdminUser(updated);
  }

  /** DB-4: restore a soft-deleted account (audit-reversible). */
  async restoreUser(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can restore accounts');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (!user.deletedAt) {
      throw new BadRequestException('User is not soft-deleted');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedReason: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        adminPanelAccess: true,
      },
    });

    await this.audit.record({
      actor,
      action: 'user.restore',
      section: 'users',
      entityType: 'User',
      entityId: user.id,
      target: user.name,
      ...requestMeta,
      before: { deletedAt: user.deletedAt.toISOString() },
      after: { status: 'ACTIVE' },
    });

    return this.toAdminUser(updated);
  }

  private toAdminUser(user: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
    role: string;
    status: string;
    createdAt: Date;
    deletedAt?: Date | null;
    adminPanelAccess: unknown;
  }): AdminUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      deleted: user.deletedAt != null,
      role: user.role as AdminUser['role'],
      status: (USER_STATUSES as readonly string[]).includes(user.status)
        ? (user.status as AdminUser['status'])
        : 'ACTIVE',
      createdAt: user.createdAt.toISOString(),
      adminPanelAccess:
        isStaffRole(user.role) && user.role !== 'SUPER_ADMIN'
          ? normalizeAdminAccess(user.adminPanelAccess)
          : null,
    };
  }

  async createUser(
    dto: AdminCreateUserDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    const email = dto.email.trim().toLowerCase();
    if (!email.includes('@')) {
      throw new BadRequestException('Invalid email');
    }
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const role = dto.role ?? 'LEARNER';
    if (role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can create super-admin accounts');
    }

    // Custom roles must exist before they can be assigned.
    let customRoleAccess: SiteAdminAccessSettings | null = null;
    if (role !== 'LEARNER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      const customRole = await this.prisma.role.findUnique({ where: { key: role } });
      if (!customRole) {
        throw new BadRequestException(`Role "${role}" does not exist`);
      }
      customRoleAccess = customRole.access ? normalizeAdminAccess(customRole.access) : null;
    }

    let phone: string | null = null;
    if (dto.phone?.trim()) {
      phone = normalizeIranianPhone(dto.phone.trim());
      if (!phone) {
        throw new BadRequestException('Invalid Iranian phone number');
      }
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }
    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        throw new ConflictException('Phone already registered');
      }
    }

    const settings = await this.siteSettings.get();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const name = dto.name.trim();

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role,
        profileComplete: true,
        emailVerified: true,
        adminPanelAccess:
          role === 'ADMIN'
            ? toJsonAccess(settings.adminAccess)
            : customRoleAccess
              ? toJsonAccess(customRoleAccess)
              : undefined,
        bootcampProfile: {
          create: {
            rank: settings.bootcamp.defaultRank,
            points: settings.bootcamp.defaultPoints,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        adminPanelAccess: true,
      },
    });

    await this.audit.record({
      actor,
      action: 'user.create',
      section: 'users',
      entityType: 'User',
      entityId: user.id,
      target: user.email ?? user.name,
      after: { role: user.role },
      ...requestMeta,
    });

    return this.toAdminUser(user);
  }

  async listRoles(): Promise<AdminRole[]> {
    const settings = await this.siteSettings.get();
    const custom = await this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } });

    const systemRoles: AdminRole[] = SYSTEM_ROLE_DEFS.map((def) => ({
      id: def.key,
      key: def.key,
      name: def.key,
      isSystem: true,
      access:
        def.key === 'ADMIN'
          ? normalizeAdminAccess(settings.adminAccess)
          : def.key === 'SUPER_ADMIN'
            ? null
            : normalizeAdminAccess({}),
    }));

    return [
      ...systemRoles,
      ...custom.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        isSystem: role.isSystem,
        access: role.access ? normalizeAdminAccess(role.access) : null,
      })),
    ];
  }

  async createRole(
    dto: AdminCreateRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminRole> {
    const key = dto.key.trim();
    if (!key) {
      throw new BadRequestException('Role key is required');
    }
    if (SYSTEM_ROLE_DEFS.some((def) => def.key === key)) {
      throw new ConflictException(`Role "${key}" is a built-in system role`);
    }

    const existing = await this.prisma.role.findUnique({ where: { key } });
    if (existing) {
      throw new ConflictException(`Role key "${key}" already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        key,
        name: dto.name.trim() || key,
        isSystem: false,
        access: dto.access ? toJsonAccess(normalizeAdminAccess(dto.access)) : undefined,
      },
    });

    await this.audit.record({
      actor,
      action: 'role.create',
      section: 'users',
      entityType: 'Role',
      entityId: role.id,
      target: role.key,
      after: { name: role.name, access: dto.access ?? null },
      ...requestMeta,
    });

    return {
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
      access: role.access ? normalizeAdminAccess(role.access) : null,
    };
  }

  async updateRole(
    id: string,
    dto: AdminUpdateRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminRole> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be edited');
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() || role.name : role.name,
        access:
          dto.access !== undefined
            ? toJsonAccess(normalizeAdminAccess(dto.access))
            : role.access === null
              ? Prisma.DbNull
              : (role.access as Prisma.InputJsonValue),
      },
    });

    await this.audit.record({
      actor,
      action: 'role.update',
      section: 'users',
      entityType: 'Role',
      entityId: id,
      target: updated.key,
      before: { name: role.name, access: role.access },
      after: { name: updated.name, access: updated.access },
      ...requestMeta,
    });

    return {
      id: updated.id,
      key: updated.key,
      name: updated.name,
      isSystem: updated.isSystem,
      access: updated.access ? normalizeAdminAccess(updated.access) : null,
    };
  }

  async deleteRole(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const inUse = await this.prisma.user.count({ where: { role: role.key } });
    if (inUse > 0) {
      throw new ConflictException(
        `Role "${role.key}" is assigned to ${inUse} user(s) — reassign them first`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'role.delete',
      section: 'users',
      entityType: 'Role',
      entityId: id,
      target: role.key,
      before: { name: role.name, access: role.access },
      ...requestMeta,
    });
    return { deleted: true };
  }

  async updateUserRole(
    id: string,
    dto: AdminUpdateUserRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (actor.role !== 'SUPER_ADMIN') {
      if (dto.role === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') {
        throw new ForbiddenException('Only super admins can manage super-admin roles');
      }
    }

    if (user.role === 'SUPER_ADMIN' && dto.role !== 'SUPER_ADMIN') {
      const superCount = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superCount <= 1) {
        throw new ForbiddenException('Cannot demote the last super admin');
      }
    }

    // Resolve the requested role: system roles are built-in, anything else must
    // exist as a custom Role record.
    let customRoleAccess: SiteAdminAccessSettings | null = null;
    if (!SYSTEM_ROLE_DEFS.some((def) => def.key === dto.role)) {
      const customRole = await this.prisma.role.findUnique({ where: { key: dto.role } });
      if (!customRole) {
        throw new BadRequestException(`Role "${dto.role}" does not exist`);
      }
      customRoleAccess = customRole.access ? normalizeAdminAccess(customRole.access) : null;
    }

    const settings = await this.siteSettings.get();
    const roleData: Prisma.UserUpdateInput = { role: dto.role };

    if (dto.role === 'ADMIN') {
      roleData.adminPanelAccess =
        (user.adminPanelAccess as Prisma.InputJsonValue | null) ??
        toJsonAccess(settings.adminAccess);
    } else if (customRoleAccess) {
      roleData.adminPanelAccess = toJsonAccess(customRoleAccess);
    } else {
      roleData.adminPanelAccess = Prisma.DbNull;
    }

    // Privilege change must invalidate existing sessions: refresh tokens issued
    // under the old role are revoked so the user re-authenticates with the new
    // role. Access tokens pick the fresh role up on their next request anyway.
    const roleChanged = user.role !== dto.role;
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: roleData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          adminPanelAccess: true,
        },
      });
      if (roleChanged) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }
      return u;
    });

    await this.audit.record({
      actor,
      action: 'user.role_change',
      section: 'users',
      entityType: 'User',
      entityId: id,
      target: updated.email ?? updated.name,
      before: { role: user.role },
      after: { role: updated.role },
      ...requestMeta,
    });

    return this.toAdminUser(updated);
  }

  async updateUserAdminAccess(
    id: string,
    dto: AdminUpdateUserAccessDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can configure moderator access');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (user.role !== 'ADMIN' && !isStaffRole(user.role)) {
      throw new BadRequestException('Panel access applies to moderator accounts only');
    }

    const adminPanelAccess = normalizeAdminAccess(dto.adminPanelAccess);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { adminPanelAccess: toJsonAccess(adminPanelAccess) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        adminPanelAccess: true,
      },
    });

    await this.audit.record({
      actor,
      action: 'user.access_change',
      section: 'users',
      entityType: 'User',
      entityId: id,
      target: updated.email ?? updated.name,
      before: { adminPanelAccess: user.adminPanelAccess },
      after: { adminPanelAccess: updated.adminPanelAccess },
      ...requestMeta,
    });

    return this.toAdminUser(updated);
  }

  async listContactMessages(): Promise<AdminContactMessage[]> {
    const messages = await this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return messages.map((msg) => ({
      id: msg.id,
      name: msg.name,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      readAt: msg.readAt?.toISOString() ?? null,
      createdAt: msg.createdAt.toISOString(),
    }));
  }

  async markContactMessageRead(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminContactMessage> {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Contact message ${id} not found`);
    }
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    // ADM-3: complete audit coverage — the previously un-audited mutation.
    await this.audit.record({
      actor,
      action: 'contact.read',
      section: 'settings',
      entityType: 'ContactMessage',
      entityId: id,
      target: existing.subject,
      before: { readAt: existing.readAt?.toISOString() ?? null },
      after: { readAt: updated.readAt?.toISOString() ?? null },
      ...requestMeta,
    });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      subject: updated.subject,
      message: updated.message,
      readAt: updated.readAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listPayments(): Promise<AdminPayment[]> {
    const payments = await this.prisma.payment.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      productType: p.productType,
      productRef: p.productRef,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  private async ensureCourseBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course) {
      throw new NotFoundException(`Course ${slug} not found`);
    }
    return course;
  }

  private async ensureChallengeBySlug(slug: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { slug },
    });
    if (!challenge) {
      throw new NotFoundException(`Challenge ${slug} not found`);
    }
    return challenge;
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

  private toAdminChallenge(challenge: {
    id: string;
    slug: string;
    title: string;
    description: string;
    points: number;
    startsAt: Date;
    endsAt: Date;
    active: boolean;
    starterCode: string;
  }): AdminChallenge {
    return {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      startsAt: challenge.startsAt.toISOString(),
      endsAt: challenge.endsAt.toISOString(),
      active: challenge.active,
      starterCode: challenge.starterCode,
    };
  }

  /* --- Support tickets ------------------------------------------------------ */

  async listTickets(): Promise<AdminTicketSummary[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return tickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.user.id,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      courseId: ticket.courseId,
      courseTitle: ticket.course?.title ?? null,
      subject: ticket.subject,
      body: ticket.body,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      replyCount: ticket._count.replies,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }));
  }

  async getTicket(id: string): Promise<AdminTicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { name: true } } },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return {
      id: ticket.id,
      userId: ticket.user.id,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      courseId: ticket.courseId,
      courseTitle: ticket.course?.title ?? null,
      subject: ticket.subject,
      body: ticket.body,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      replyCount: ticket.replies.length,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      replies: ticket.replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        isStaff: reply.isStaff,
        authorName: reply.author.name,
        createdAt: reply.createdAt.toISOString(),
      })),
    };
  }

  async replyToTicket(
    id: string,
    dto: AdminReplyTicketDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminTicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    await this.prisma.ticketReply.create({
      data: {
        ticketId: id,
        authorId: actor.id,
        body: dto.body,
        isStaff: true,
      },
    });
    if (ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }
    await this.audit.record({
      actor,
      action: 'ticket.reply',
      section: 'tickets',
      entityType: 'SupportTicket',
      entityId: id,
      target: ticket.subject,
      after: { replied: true },
      ...requestMeta,
    });
    return this.getTicket(id);
  }

  async updateTicket(
    id: string,
    dto: AdminUpdateTicketDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminTicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        priority: dto.priority ?? undefined,
      },
    });
    await this.audit.record({
      actor,
      action: 'ticket.update',
      section: 'tickets',
      entityType: 'SupportTicket',
      entityId: id,
      target: ticket.subject,
      before: { status: ticket.status, priority: ticket.priority },
      after: { status: dto.status ?? ticket.status, priority: dto.priority ?? ticket.priority },
      ...requestMeta,
    });
    return this.getTicket(id);
  }

  /* --- Learner inbox messages ------------------------------------------------ */

  async listMessages(): Promise<AdminLearnerMessage[]> {
    const messages = await this.prisma.learnerMessage.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return messages.map((message) => ({
      id: message.id,
      userId: message.user.id,
      userName: message.user.name,
      userEmail: message.user.email,
      subject: message.subject,
      body: message.body,
      readAt: message.readAt?.toISOString() ?? null,
      createdBy: message.createdBy,
      createdAt: message.createdAt.toISOString(),
    }));
  }

  async sendMessage(
    dto: AdminSendMessageDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLearnerMessage> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }
    const message = await this.prisma.learnerMessage.create({
      data: {
        userId: dto.userId,
        subject: dto.subject,
        body: dto.body,
        createdBy: actor.email ?? actor.name ?? 'admin',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await this.audit.record({
      actor,
      action: 'message.send',
      section: 'messages',
      entityType: 'LearnerMessage',
      entityId: message.id,
      target: message.user.email ?? message.user.name,
      after: { subject: message.subject },
      ...requestMeta,
    });
    return {
      id: message.id,
      userId: message.user.id,
      userName: message.user.name,
      userEmail: message.user.email,
      subject: message.subject,
      body: message.body,
      readAt: message.readAt?.toISOString() ?? null,
      createdBy: message.createdBy,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async deleteMessage(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    const message = await this.prisma.learnerMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    await this.prisma.learnerMessage.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'message.delete',
      section: 'messages',
      entityType: 'LearnerMessage',
      entityId: id,
      target: message.subject,
      ...requestMeta,
    });
  }

  /* --- Competitions ----------------------------------------------------------- */

  async listCompetitions(): Promise<AdminCompetition[]> {
    const competitions = await this.prisma.competition.findMany({
      include: { _count: { select: { registrations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return competitions.map((competition) => ({
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.toISOString(),
      endsAt: competition.endsAt.toISOString(),
      active: competition.active,
      registrationCount: competition._count.registrations,
      createdAt: competition.createdAt.toISOString(),
    }));
  }

  async createCompetition(
    dto: AdminCreateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    const existing = await this.prisma.competition.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Competition slug "${dto.slug}" already exists`);
    }
    const competition = await this.prisma.competition.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        active: dto.active ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'competition.create',
      section: 'competitions',
      entityType: 'Competition',
      entityId: competition.id,
      target: competition.title,
      after: { slug: competition.slug, active: competition.active },
      ...requestMeta,
    });
    return {
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.toISOString(),
      endsAt: competition.endsAt.toISOString(),
      active: competition.active,
      registrationCount: 0,
      createdAt: competition.createdAt.toISOString(),
    };
  }

  async updateCompetition(
    id: string,
    dto: AdminUpdateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    if (dto.slug && dto.slug !== competition.slug) {
      const existing = await this.prisma.competition.findUnique({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Competition slug "${dto.slug}" already exists`);
      }
    }
    const updated = await this.prisma.competition.update({
      where: { id },
      data: {
        slug: dto.slug ?? undefined,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active ?? undefined,
      },
      include: { _count: { select: { registrations: true } } },
    });
    await this.audit.record({
      actor,
      action: 'competition.update',
      section: 'competitions',
      entityType: 'Competition',
      entityId: id,
      target: updated.title,
      before: { active: competition.active, startsAt: competition.startsAt, endsAt: competition.endsAt },
      after: { active: updated.active, startsAt: updated.startsAt, endsAt: updated.endsAt },
      ...requestMeta,
    });
    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      description: updated.description,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      active: updated.active,
      registrationCount: updated._count.registrations,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteCompetition(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    await this.prisma.competition.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'competition.delete',
      section: 'competitions',
      entityType: 'Competition',
      entityId: id,
      target: competition.title,
      before: { slug: competition.slug },
      ...requestMeta,
    });
  }

  async listCompetitionRegistrations(id: string): Promise<AdminCompetitionRegistration[]> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    const registrations = await this.prisma.competitionRegistration.findMany({
      where: { competitionId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return registrations.map((registration) => ({
      id: registration.id,
      userId: registration.user.id,
      userName: registration.user.name,
      userEmail: registration.user.email,
      createdAt: registration.createdAt.toISOString(),
    }));
  }

  /* --- Orders ----------------------------------------------------------------- */

  async listOrders(): Promise<AdminOrder[]> {
    const orders = await this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map((order) => ({
      id: order.id,
      userId: order.user.id,
      userName: order.user.name,
      userEmail: order.user.email,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      itemCount: order._count.items,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  /* --- Entitlements ------------------------------------------------------------ */

  async listEntitlements(): Promise<AdminEntitlement[]> {
    const entitlements = await this.prisma.entitlement.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return entitlements.map((entitlement) => ({
      id: entitlement.id,
      userId: entitlement.user.id,
      userName: entitlement.user.name,
      userEmail: entitlement.user.email,
      resourceType: entitlement.resourceType as string,
      resourceId: entitlement.resourceId,
      source: entitlement.source,
      createdAt: entitlement.createdAt.toISOString(),
    }));
  }

  async grantEntitlement(
    dto: AdminGrantEntitlementDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminEntitlement> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }
    const resourceType = toResourceType(dto.resourceType);
    const existing = await this.prisma.entitlement.findUnique({
      where: {
        userId_resourceType_resourceId: {
          userId: dto.userId,
          resourceType,
          resourceId: dto.resourceId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This entitlement already exists for the user');
    }
    const entitlement = await this.prisma.entitlement.create({
      data: {
        userId: dto.userId,
        resourceType,
        resourceId: dto.resourceId,
        source: dto.source ?? 'FREE',
      },
    });
    await this.audit.record({
      actor,
      action: 'entitlement.grant',
      section: 'payments',
      entityType: 'Entitlement',
      entityId: entitlement.id,
      target: user.email ?? user.name,
      ...requestMeta,
      after: {
        resourceType: entitlement.resourceType,
        resourceId: entitlement.resourceId,
        source: entitlement.source,
      },
    });
    return {
      id: entitlement.id,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      resourceType: entitlement.resourceType,
      resourceId: entitlement.resourceId,
      source: entitlement.source,
      createdAt: entitlement.createdAt.toISOString(),
    };
  }

  async revokeEntitlement(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    const entitlement = await this.prisma.entitlement.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!entitlement) {
      throw new NotFoundException(`Entitlement ${id} not found`);
    }
    await this.prisma.entitlement.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'entitlement.revoke',
      section: 'payments',
      entityType: 'Entitlement',
      entityId: id,
      target: entitlement.user.email ?? entitlement.user.name,
      ...requestMeta,
      before: {
        resourceType: entitlement.resourceType,
        resourceId: entitlement.resourceId,
        source: entitlement.source,
      },
    });
  }

  /* --- Wallets ------------------------------------------------------------------ */

  async listWallets(): Promise<AdminWalletSummary[]> {
    const wallets = await this.prisma.learnerWallet.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { transactions: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return wallets.map((wallet) => ({
      userId: wallet.user.id,
      userName: wallet.user.name,
      userEmail: wallet.user.email,
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      transactionCount: wallet._count.transactions,
      lastTransactionAt: wallet.transactions[0]?.createdAt.toISOString() ?? null,
    }));
  }

  async getWallet(userId: string): Promise<AdminWalletDetail> {
    const wallet = await this.prisma.learnerWallet.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }
    return {
      userId: wallet.user.id,
      userName: wallet.user.name,
      userEmail: wallet.user.email,
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      transactionCount: wallet.transactions.length,
      lastTransactionAt: wallet.transactions[0]?.createdAt.toISOString() ?? null,
      transactions: wallet.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amountCents: transaction.amountCents,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      })),
    };
  }

  async adjustWallet(
    userId: string,
    dto: AdminAdjustWalletDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminWalletDetail> {
    const wallet = await this.prisma.learnerWallet.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }
    if (dto.type === 'DEBIT' && wallet.balanceCents < dto.amountCents) {
      throw new BadRequestException('Debit exceeds the current wallet balance');
    }

    const reason = dto.reason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException('An adjustment reason is required');
    }
    const description = dto.description?.trim() ? `${dto.description.trim()} — ${reason}` : reason;

    await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: dto.type,
          amountCents: dto.amountCents,
          description,
        },
      }),
      this.prisma.learnerWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents:
            dto.type === 'CREDIT'
              ? wallet.balanceCents + dto.amountCents
              : wallet.balanceCents - dto.amountCents,
        },
      }),
    ]);

        await this.audit.record({
      actor,
      action: 'wallet.adjust',
      section: 'payments',
      entityType: 'LearnerWallet',
      entityId: wallet.id,
      target: wallet.user.email ?? wallet.user.name,
      before: { balanceCents: wallet.balanceCents },
      after: {
        balanceCents:
          dto.type === 'CREDIT'
            ? wallet.balanceCents + dto.amountCents
            : wallet.balanceCents - dto.amountCents,
        type: dto.type,
        amountCents: dto.amountCents,
      },
      reason,
      ...requestMeta,
    });

    return this.getWallet(userId);
  }

  /** Admin-initiated refund (full or partial) — delegates to PaymentsService
   *  which enforces the payment state machine and records a wallet CREDIT. */
  async refundPayment(
    paymentId: string,
    dto: RefundPaymentDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminPayment> {
    const before = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, amountCents: true, userId: true },
    });
    if (!before) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const result = await this.paymentsService.refundPayment(
      paymentId,
      dto.amountCents,
      dto.reason,
    );

    await this.audit.record({
      actor,
      action: 'payment.refund',
      section: 'payments',
      entityType: 'Payment',
      entityId: paymentId,
            target: before.userId,
      before: { status: before.status, amountCents: before.amountCents },
      after: { status: result.status, refundCents: dto.amountCents ?? before.amountCents },
      reason: dto.reason,
      ...requestMeta,
    });

    return result as unknown as AdminPayment;
  }
}
