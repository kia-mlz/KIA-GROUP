import { Injectable, Logger } from '@nestjs/common';
import type { AdminAuditLogList, AdminAuditLogParams, AuthUser } from '@kia./shared';
import { Prisma } from '@kia./platform';
import { PrismaService } from '@kia./platform';

/** Request-scoped metadata captured for audit entries. */
export interface AdminAuditRequestMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Payload for a single audit trail entry. */
export interface AdminAuditEntry {
  actor?: AuthUser | null;
  action: string;
  section: string;
  entityType: string;
  entityId?: string | null;
  target?: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Client request metadata captured by controllers for audit attribution. */
export interface RequestAuditMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/** Convert an arbitrary value to a Prisma JSON value (undefined → DB null). */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * Immutable audit trail for the admin panel.
 *
 * Writes are best-effort: an audit failure is logged but never breaks the
 * underlying business operation. There is intentionally NO update or delete
 * capability — audit history cannot be modified through any API.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AdminAuditEntry): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          actorId: entry.actor?.id ?? null,
          actorName: entry.actor?.name ?? '',
          actorRole: entry.actor?.role ?? '',
          action: entry.action,
          section: entry.section,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          target: entry.target ?? '',
          before: toJson(entry.before),
          after: toJson(entry.after),
          reason: entry.reason ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          requestId: entry.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log for action "${entry.action}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async list(params: AdminAuditLogParams): Promise<AdminAuditLogList> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(params.limit ?? DEFAULT_LIMIT)));

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (params.section) {
      where.section = params.section;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.actorId) {
      where.actorId = params.actorId;
    }
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { target: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { actorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorName: row.actorName,
        actorRole: row.actorRole,
        action: row.action,
        section: row.section,
        entityType: row.entityType,
        entityId: row.entityId,
        target: row.target,
        before: row.before ?? null,
        after: row.after ?? null,
        reason: row.reason,
        ip: row.ip,
        userAgent: row.userAgent,
        requestId: row.requestId,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      hasNext: page * limit < total,
    };
  }
}
