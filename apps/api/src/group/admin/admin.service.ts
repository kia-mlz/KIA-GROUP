import { Injectable } from '@nestjs/common';
import type {
  AdminChallenge,
  AdminCompetition,
  AdminCompetitionRegistration,
  AdminContactMessage,
  AdminCourse,
  AdminDiscountCode,
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
} from '@kia./shared';
import { MediaStorageService, PrismaService, SiteSettingsService } from '@kia./platform';
import { PaymentsService } from '../commerce/payments/payments.service';
import {
  AdminAdjustWalletDto,
  AdminCreateChallengeDto,
  AdminCreateCompetitionDto,
  AdminCreateCourseDto,
  AdminCreateDiscountCodeDto,
  AdminCreateLessonDto,
  AdminCreateRoleDto,
  AdminCreateUserDto,
  AdminGrantEntitlementDto,
  AdminReplyTicketDto,
  AdminSendMessageDto,
  AdminUpdateChallengeDto,
  AdminUpdateCompetitionDto,
  AdminUpdateCourseDto,
  AdminUpdateDiscountCodeDto,
  AdminUpdateLessonDto,
  AdminUpdateRoleDto,
  AdminUpdateTicketDto,
  AdminUpdateUserAccessDto,
  AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
  RefundPaymentDto,
} from './dto/admin.dto';
import { AdminAcademyService } from './admin-academy.service';
import { AdminAuditService } from './audit.service';
import { AdminCommerceService } from './admin-commerce.service';
import { AdminDiscountsService } from './admin-discounts.service';
import { AdminEventsService } from './admin-events.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminSupportService } from './admin-support.service';
import { AdminUsersService } from './admin-users.service';
import type { AdminRequestMeta } from './admin-types';

export type { AdminRequestMeta } from './admin-types';

/**
 * Admin facade.
 *
 * The endpoint surface is unchanged (the controller keeps calling one service),
 * but every department's logic now lives in its own service:
 *
 *  - {@link AdminStatsService}    — platform dashboard counters
 *  - {@link AdminUsersService}    — accounts, roles, moderator panel access
 *  - {@link AdminAcademyService}  — courses, lessons, lesson media
 *  - {@link AdminEventsService}   — challenges and competitions
 *  - {@link AdminSupportService}  — tickets, learner inbox, contact form
 *  - {@link AdminCommerceService} — payments, orders, entitlements, wallets
 *  - {@link AdminDiscountsService}— course discount codes
 *
 * The department services are plain classes owned by this facade (instantiated
 * from its constructor) so Nest wiring — and the existing spec, which builds
 * `new AdminService(...)` with prisma/media/settings/audit/payments — stays
 * exactly as it was. New callers should inject the department service directly.
 */
@Injectable()
export class AdminService {
  private readonly statsService: AdminStatsService;
  private readonly usersService: AdminUsersService;
  private readonly academyService: AdminAcademyService;
  private readonly eventsService: AdminEventsService;
  private readonly supportService: AdminSupportService;
  private readonly commerceService: AdminCommerceService;
  private readonly discountsService: AdminDiscountsService;

  constructor(
    prisma: PrismaService,
    mediaStorage: MediaStorageService,
    siteSettings: SiteSettingsService,
    audit: AdminAuditService,
    paymentsService: PaymentsService,
  ) {
    this.statsService = new AdminStatsService(prisma);
    this.usersService = new AdminUsersService(prisma, siteSettings, audit);
    this.academyService = new AdminAcademyService(prisma, mediaStorage, audit);
    this.eventsService = new AdminEventsService(prisma, audit);
    this.supportService = new AdminSupportService(prisma, audit);
    this.commerceService = new AdminCommerceService(prisma, audit, paymentsService);
    this.discountsService = new AdminDiscountsService(prisma, audit);
  }

  /* --- Platform ------------------------------------------------------------- */

  getStats(): Promise<AdminStats> {
    return this.statsService.getStats();
  }

  /* --- Kia Academy ---------------------------------------------------------- */

  listCourses(): Promise<AdminCourse[]> {
    return this.academyService.listCourses();
  }

  createCourse(
    dto: AdminCreateCourseDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCourse> {
    return this.academyService.createCourse(dto, actor, requestMeta);
  }

  updateCourse(
    slug: string,
    dto: AdminUpdateCourseDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCourse> {
    return this.academyService.updateCourse(slug, dto, actor, requestMeta);
  }

  deleteCourse(
    slug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    return this.academyService.deleteCourse(slug, actor, requestMeta);
  }

  createLesson(
    courseSlug: string,
    dto: AdminCreateLessonDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    return this.academyService.createLesson(courseSlug, dto, actor, requestMeta);
  }

  updateLesson(
    courseSlug: string,
    lessonSlug: string,
    dto: AdminUpdateLessonDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    return this.academyService.updateLesson(courseSlug, lessonSlug, dto, actor, requestMeta);
  }

  deleteLesson(
    courseSlug: string,
    lessonSlug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    return this.academyService.deleteLesson(courseSlug, lessonSlug, actor, requestMeta);
  }

  uploadLessonVideo(
    courseSlug: string,
    lessonSlug: string,
    file: Express.Multer.File,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    return this.academyService.uploadLessonVideo(courseSlug, lessonSlug, file, actor, requestMeta);
  }

  deleteLessonVideo(
    courseSlug: string,
    lessonSlug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLesson> {
    return this.academyService.deleteLessonVideo(courseSlug, lessonSlug, actor, requestMeta);
  }

  /* --- KIA Event ------------------------------------------------------------ */

  listChallenges(): Promise<AdminChallenge[]> {
    return this.eventsService.listChallenges();
  }

  createChallenge(
    dto: AdminCreateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    return this.eventsService.createChallenge(dto, actor, requestMeta);
  }

  updateChallenge(
    slug: string,
    dto: AdminUpdateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    return this.eventsService.updateChallenge(slug, dto, actor, requestMeta);
  }

  deleteChallenge(
    slug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    return this.eventsService.deleteChallenge(slug, actor, requestMeta);
  }

  listCompetitions(): Promise<AdminCompetition[]> {
    return this.eventsService.listCompetitions();
  }

  createCompetition(
    dto: AdminCreateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    return this.eventsService.createCompetition(dto, actor, requestMeta);
  }

  updateCompetition(
    id: string,
    dto: AdminUpdateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    return this.eventsService.updateCompetition(id, dto, actor, requestMeta);
  }

  deleteCompetition(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    return this.eventsService.deleteCompetition(id, actor, requestMeta);
  }

  listCompetitionRegistrations(id: string): Promise<AdminCompetitionRegistration[]> {
    return this.eventsService.listCompetitionRegistrations(id);
  }

  /* --- Platform people ------------------------------------------------------ */

  listUsers(params: AdminUserListParams): Promise<AdminUserList> {
    return this.usersService.listUsers(params);
  }

  createUser(
    dto: AdminCreateUserDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.createUser(dto, actor, requestMeta);
  }

  updateUserStatus(
    id: string,
    dto: AdminUpdateUserStatusDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.updateUserStatus(id, dto, actor, requestMeta);
  }

  softDeleteUser(
    id: string,
    reason: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.softDeleteUser(id, reason, actor, requestMeta);
  }

  restoreUser(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.restoreUser(id, actor, requestMeta);
  }

  updateUserRole(
    id: string,
    dto: AdminUpdateUserRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.updateUserRole(id, dto, actor, requestMeta);
  }

  updateUserAdminAccess(
    id: string,
    dto: AdminUpdateUserAccessDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminUser> {
    return this.usersService.updateUserAdminAccess(id, dto, actor, requestMeta);
  }

  listRoles(): Promise<AdminRole[]> {
    return this.usersService.listRoles();
  }

  createRole(
    dto: AdminCreateRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminRole> {
    return this.usersService.createRole(dto, actor, requestMeta);
  }

  updateRole(
    id: string,
    dto: AdminUpdateRoleDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminRole> {
    return this.usersService.updateRole(id, dto, actor, requestMeta);
  }

  deleteRole(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    return this.usersService.deleteRole(id, actor, requestMeta);
  }

  /* --- Support --------------------------------------------------------------- */

  listTickets(): Promise<AdminTicketSummary[]> {
    return this.supportService.listTickets();
  }

  getTicket(id: string): Promise<AdminTicketDetail> {
    return this.supportService.getTicket(id);
  }

  replyToTicket(
    id: string,
    dto: AdminReplyTicketDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminTicketDetail> {
    return this.supportService.replyToTicket(id, dto, actor, requestMeta);
  }

  updateTicket(
    id: string,
    dto: AdminUpdateTicketDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminTicketDetail> {
    return this.supportService.updateTicket(id, dto, actor, requestMeta);
  }

  listMessages(): Promise<AdminLearnerMessage[]> {
    return this.supportService.listMessages();
  }

  sendMessage(
    dto: AdminSendMessageDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminLearnerMessage> {
    return this.supportService.sendMessage(dto, actor, requestMeta);
  }

  deleteMessage(id: string, actor: AuthUser, requestMeta: AdminRequestMeta = {}): Promise<void> {
    return this.supportService.deleteMessage(id, actor, requestMeta);
  }

  listContactMessages(): Promise<AdminContactMessage[]> {
    return this.supportService.listContactMessages();
  }

  markContactMessageRead(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminContactMessage> {
    return this.supportService.markContactMessageRead(id, actor, requestMeta);
  }

  /* --- Commerce --------------------------------------------------------------- */

  listPayments(): Promise<AdminPayment[]> {
    return this.commerceService.listPayments();
  }

  listOrders(): Promise<AdminOrder[]> {
    return this.commerceService.listOrders();
  }

  listEntitlements(): Promise<AdminEntitlement[]> {
    return this.commerceService.listEntitlements();
  }

  grantEntitlement(
    dto: AdminGrantEntitlementDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminEntitlement> {
    return this.commerceService.grantEntitlement(dto, actor, requestMeta);
  }

  revokeEntitlement(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    return this.commerceService.revokeEntitlement(id, actor, requestMeta);
  }

  listWallets(): Promise<AdminWalletSummary[]> {
    return this.commerceService.listWallets();
  }

  getWallet(userId: string): Promise<AdminWalletDetail> {
    return this.commerceService.getWallet(userId);
  }

  adjustWallet(
    userId: string,
    dto: AdminAdjustWalletDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminWalletDetail> {
    return this.commerceService.adjustWallet(userId, dto, actor, requestMeta);
  }

  refundPayment(
    paymentId: string,
    dto: RefundPaymentDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminPayment> {
    return this.commerceService.refundPayment(paymentId, dto, actor, requestMeta);
  }

  /* --- Discount codes ---------------------------------------------------------- */

  listDiscountCodes(): Promise<AdminDiscountCode[]> {
    return this.discountsService.listDiscountCodes();
  }

  createDiscountCode(
    dto: AdminCreateDiscountCodeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminDiscountCode> {
    return this.discountsService.createDiscountCode(dto, actor, requestMeta);
  }

  updateDiscountCode(
    id: string,
    dto: AdminUpdateDiscountCodeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminDiscountCode> {
    return this.discountsService.updateDiscountCode(id, dto, actor, requestMeta);
  }

  deleteDiscountCode(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    return this.discountsService.deleteDiscountCode(id, actor, requestMeta);
  }
}
