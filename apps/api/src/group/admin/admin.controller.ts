import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthUser, AdminUserListParams } from '@kia./shared';
import { AdminAccess } from '@kia./platform';
import { AuditMeta, type AuditRequestMeta } from '@kia./platform';
import { CurrentUser } from '@kia./platform';
import { Roles } from '@kia./platform';
import { AdminAccessGuard } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { MAX_LESSON_VIDEO_BYTES } from '@kia./platform';
import { TwoFactorService } from '../auth/two-factor/two-factor.service';
import { AdminService } from './admin.service';
import { AdminAuditService } from './audit.service';
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
  AdminSoftDeleteUserDto,
  RefundPaymentDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AdminAuditService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Get('stats')
  @AdminAccess('stats', 'view')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('courses')
  @AdminAccess('courses', 'view')
  listCourses() {
    return this.adminService.listCourses();
  }

  @Post('courses')
  @AdminAccess('courses', 'manage')
  createCourse(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateCourseDto,
  ) {
    return this.adminService.createCourse(dto, actor, auditMeta);
  }

  @Patch('courses/:slug')
  @AdminAccess('courses', 'edit')
  updateCourse(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Body() dto: AdminUpdateCourseDto,
  ) {
    return this.adminService.updateCourse(slug, dto, actor, auditMeta);
  }

  @Delete('courses/:slug')
  @AdminAccess('courses', 'manage')
  deleteCourse(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
  ) {
    return this.adminService.deleteCourse(slug, actor, auditMeta);
  }

  @Post('courses/:slug/lessons')
  @AdminAccess('courses', 'manage')
  createLesson(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Body() dto: AdminCreateLessonDto,
  ) {
    return this.adminService.createLesson(slug, dto, actor, auditMeta);
  }

  @Patch('courses/:slug/lessons/:lessonSlug')
  @AdminAccess('courses', 'edit')
  updateLesson(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() dto: AdminUpdateLessonDto,
  ) {
    return this.adminService.updateLesson(slug, lessonSlug, dto, actor, auditMeta);
  }

  @Delete('courses/:slug/lessons/:lessonSlug')
  @AdminAccess('courses', 'manage')
  deleteLesson(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.adminService.deleteLesson(slug, lessonSlug, actor, auditMeta);
  }

  @Post('courses/:slug/lessons/:lessonSlug/video')
  @AdminAccess('courses', 'edit')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LESSON_VIDEO_BYTES },
    }),
  )
  uploadLessonVideo(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminService.uploadLessonVideo(slug, lessonSlug, file, actor, auditMeta);
  }

  @Delete('courses/:slug/lessons/:lessonSlug/video')
  @AdminAccess('courses', 'edit')
  deleteLessonVideo(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.adminService.deleteLessonVideo(slug, lessonSlug, actor, auditMeta);
  }

  @Get('challenges')
  @AdminAccess('challenges', 'view')
  listChallenges() {
    return this.adminService.listChallenges();
  }

  @Post('challenges')
  @AdminAccess('challenges', 'manage')
  createChallenge(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateChallengeDto,
  ) {
    return this.adminService.createChallenge(dto, actor, auditMeta);
  }

  @Patch('challenges/:slug')
  @AdminAccess('challenges', 'edit')
  updateChallenge(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
    @Body() dto: AdminUpdateChallengeDto,
  ) {
    return this.adminService.updateChallenge(slug, dto, actor, auditMeta);
  }

  @Delete('challenges/:slug')
  @AdminAccess('challenges', 'manage')
  deleteChallenge(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('slug') slug: string,
  ) {
    return this.adminService.deleteChallenge(slug, actor, auditMeta);
  }

  @Get('users')
  @AdminAccess('users', 'view')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('deleted') deleted?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      role,
      status: (status ?? '') as AdminUserListParams['status'],
      // Unknown values fall back to the default (active only) rather than
      // widening the query to deleted accounts.
      deleted: (['deleted', 'all'] as const).includes(deleted as 'deleted')
        ? (deleted as AdminUserListParams['deleted'])
        : 'active',
    });
  }

  @Patch('users/:id/status')
  @AdminAccess('users', 'edit')
  updateUserStatus(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto, actor, auditMeta);
  }

  /** DB-4: soft delete keeps the row + financial history, clears PII, forces logout. */
  @Delete('users/:id')
  @AdminAccess('users', 'manage')
  softDeleteUser(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminSoftDeleteUserDto,
  ) {
    return this.adminService.softDeleteUser(id, dto.reason, actor, auditMeta);
  }

  /** DB-4: reverse a soft delete (audit-reversible). */
  @Post('users/:id/restore')
  @AdminAccess('users', 'manage')
  restoreUser(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.restoreUser(id, actor, auditMeta);
  }

  @Post('users')
  @AdminAccess('users', 'manage')
  createUser(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.adminService.createUser(dto, actor, auditMeta);
  }

  @Patch('users/:id/role')
  @AdminAccess('users', 'edit')
  updateUserRole(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto, actor, auditMeta);
  }

  @Patch('users/:id/access')
  @AdminAccess('users', 'edit')
  updateUserAccess(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserAccessDto,
  ) {
    return this.adminService.updateUserAdminAccess(id, dto, actor, auditMeta);
  }

  @Get('roles')
  @AdminAccess('users', 'view')
  listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  @AdminAccess('users', 'manage')
  createRole(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateRoleDto,
  ) {
    return this.adminService.createRole(dto, actor, auditMeta);
  }

  @Patch('roles/:id')
  @AdminAccess('users', 'edit')
  updateRole(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateRoleDto,
  ) {
    return this.adminService.updateRole(id, dto, actor, auditMeta);
  }

  @Delete('roles/:id')
  @AdminAccess('users', 'manage')
  deleteRole(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteRole(id, actor, auditMeta);
  }

  @Get('contact')
  @AdminAccess('settings', 'view')
  listContactMessages() {
    return this.adminService.listContactMessages();
  }

  @Patch('contact/:id/read')
  @AdminAccess('settings', 'edit')
  markContactMessageRead(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.markContactMessageRead(id, actor, auditMeta);
  }

  @Get('payments')
  @AdminAccess('payments', 'view')
  listPayments() {
    return this.adminService.listPayments();
  }

  /* --- Support tickets -------------------------------------------------------- */

  @Get('tickets')
  @AdminAccess('tickets', 'view')
  listTickets() {
    return this.adminService.listTickets();
  }

  @Get('tickets/:id')
  @AdminAccess('tickets', 'view')
  getTicket(@Param('id') id: string) {
    return this.adminService.getTicket(id);
  }

  @Post('tickets/:id/replies')
  @AdminAccess('tickets', 'edit')
  replyToTicket(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminReplyTicketDto,
  ) {
    return this.adminService.replyToTicket(id, dto, actor, auditMeta);
  }

  @Patch('tickets/:id')
  @AdminAccess('tickets', 'edit')
  updateTicket(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateTicketDto,
  ) {
    return this.adminService.updateTicket(id, dto, actor, auditMeta);
  }

  /* --- Learner inbox messages --------------------------------------------------- */

  @Get('messages')
  @AdminAccess('messages', 'view')
  listMessages() {
    return this.adminService.listMessages();
  }

  @Post('messages')
  @AdminAccess('messages', 'manage')
  sendMessage(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminSendMessageDto,
  ) {
    return this.adminService.sendMessage(dto, actor, auditMeta);
  }

  @Delete('messages/:id')
  @AdminAccess('messages', 'manage')
  deleteMessage(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteMessage(id, actor, auditMeta);
  }

  /* --- Competitions --------------------------------------------------------------- */

  @Get('competitions')
  @AdminAccess('competitions', 'view')
  listCompetitions() {
    return this.adminService.listCompetitions();
  }

  @Post('competitions')
  @AdminAccess('competitions', 'manage')
  createCompetition(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateCompetitionDto,
  ) {
    return this.adminService.createCompetition(dto, actor, auditMeta);
  }

  @Patch('competitions/:id')
  @AdminAccess('competitions', 'edit')
  updateCompetition(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateCompetitionDto,
  ) {
    return this.adminService.updateCompetition(id, dto, actor, auditMeta);
  }

  @Delete('competitions/:id')
  @AdminAccess('competitions', 'manage')
  deleteCompetition(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteCompetition(id, actor, auditMeta);
  }

  @Get('competitions/:id/registrations')
  @AdminAccess('competitions', 'view')
  listCompetitionRegistrations(@Param('id') id: string) {
    return this.adminService.listCompetitionRegistrations(id);
  }

  /* --- Finance: orders / entitlements / wallets ------------------------------------- */

  @Get('orders')
  @AdminAccess('payments', 'view')
  listOrders() {
    return this.adminService.listOrders();
  }

  @Get('entitlements')
  @AdminAccess('payments', 'view')
  listEntitlements() {
    return this.adminService.listEntitlements();
  }

  @Post('entitlements')
  @AdminAccess('payments', 'manage')
  grantEntitlement(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminGrantEntitlementDto,
  ) {
    return this.adminService.grantEntitlement(dto, actor, auditMeta);
  }

  @Delete('entitlements/:id')
  @AdminAccess('payments', 'manage')
  revokeEntitlement(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.revokeEntitlement(id, actor, auditMeta);
  }

  @Get('wallets')
  @AdminAccess('payments', 'view')
  listWallets() {
    return this.adminService.listWallets();
  }

  @Get('wallets/:userId')
  @AdminAccess('payments', 'view')
  getWallet(@Param('userId') userId: string) {
    return this.adminService.getWallet(userId);
  }

  @Post('wallets/:userId/adjust')
  @AdminAccess('payments', 'manage')
  adjustWallet(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('userId') userId: string,
    @Body() dto: AdminAdjustWalletDto,
  ) {
        return this.adminService.adjustWallet(userId, dto, actor, auditMeta);
  }

  @Post('payments/:id/refund')
  @AdminAccess('payments', 'manage')
  refundPayment(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.adminService.refundPayment(paymentId, dto, actor, auditMeta);
  }

  /* --- Discount codes -------------------------------------------------------------- */

  @Get('discounts')
  @AdminAccess('discounts', 'view')
  listDiscountCodes() {
    return this.adminService.listDiscountCodes();
  }

  @Post('discounts')
  @AdminAccess('discounts', 'manage')
  createDiscountCode(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Body() dto: AdminCreateDiscountCodeDto,
  ) {
    return this.adminService.createDiscountCode(dto, actor, auditMeta);
  }

  @Patch('discounts/:id')
  @AdminAccess('discounts', 'manage')
  updateDiscountCode(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
    @Body() dto: AdminUpdateDiscountCodeDto,
  ) {
    return this.adminService.updateDiscountCode(id, dto, actor, auditMeta);
  }

  @Delete('discounts/:id')
  @AdminAccess('discounts', 'manage')
  deleteDiscountCode(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteDiscountCode(id, actor, auditMeta);
  }

  /* --- Audit log (read-only; immutable) --------------------------------------------- */

  /**
   * AUTH-5: staff 2FA enrollment overview (SUPER_ADMIN manages overrides).
   * Reading the list requires the users section; disabling another staff
   * member's 2FA is the emergency-break-glass action below.
   */
  @Get('staff-2fa')
  @AdminAccess('users', 'view')
  listStaffTwoFactor() {
    return this.twoFactorService.listStaffTwoFactor();
  }

  @Delete('staff-2fa/:userId')
  @AdminAccess('users', 'edit')
  async disableStaffTwoFactor(
    @CurrentUser() actor: AuthUser,
    @AuditMeta() auditMeta: AuditRequestMeta,
    @Param('userId') targetUserId: string,
  ) {
    const result = await this.twoFactorService.disableForUser(actor, targetUserId);
    await this.audit.record({
      actor,
      action: 'user.2fa.disable',
      section: 'users',
      entityType: 'User',
      entityId: targetUserId,
      target: targetUserId,
      ...auditMeta,
    });
    return result;
  }

  @Get('audit-logs')
  @AdminAccess('audit', 'view')
  listAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('section') section?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.audit.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      section,
      action,
      actorId,
      search,
      from,
      to,
    });
  }
}
