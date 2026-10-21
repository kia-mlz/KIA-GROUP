import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminRole,
  AdminUser,
  AdminUserList,
  AdminUserListParams,
  AuthUser,
  SiteAdminAccessSettings,
} from '@kia./shared';
import { normalizeAdminAccess, normalizeIranianPhone } from '@kia./shared';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Prisma, PrismaService, SiteSettingsService } from '@kia./platform';
import {
  AdminCreateRoleDto,
  AdminCreateUserDto,
  AdminUpdateRoleDto,
  AdminUpdateUserAccessDto,
  AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

const BCRYPT_ROUNDS = 12;

/** Valid account statuses for admin-managed users. */
const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
type UserStatus = (typeof USER_STATUSES)[number];

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

/**
 * Platform people department — learner/staff accounts, roles and moderator
 * panel access. Moved verbatim out of the former god-service; behaviour is
 * unchanged (including the session-revocation and self-lockout guards).
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
    private readonly audit: AdminAuditService,
  ) {}

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

  /* --- Roles ------------------------------------------------------------------ */

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
}
