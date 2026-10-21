import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminContactMessage,
  AdminLearnerMessage,
  AdminTicketDetail,
  AdminTicketSummary,
  AuthUser,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import {
  AdminReplyTicketDto,
  AdminSendMessageDto,
  AdminUpdateTicketDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

/**
 * Support department — support tickets, the learner inbox and the public
 * contact form. Moved verbatim out of the former god-service; behaviour is
 * unchanged.
 */
@Injectable()
export class AdminSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

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

  /* --- Contact form inbox ---------------------------------------------------- */

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
}
