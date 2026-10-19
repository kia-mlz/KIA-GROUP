import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTicketDto,
  SupportTicketDetail,
  SupportTicketSummary,
  TicketAttachmentDto,
  TicketReplyDto,
} from '@kia./shared';
import { containsProgrammingCode } from '@kia./shared';
import { PrismaService } from '@kia./platform';
import { TicketAttachmentStorageService } from './ticket-attachment-storage.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: TicketAttachmentStorageService,
  ) {}

  async listMine(userId: string): Promise<SupportTicketSummary[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((ticket) => this.toSummary(ticket));
  }

  async getMine(userId: string, id: string): Promise<SupportTicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        _count: { select: { replies: true } },
        attachments: {
          where: { replyId: null },
          orderBy: { createdAt: 'asc' },
        },
        replies: {
          include: {
            author: { select: { name: true, role: true } },
            attachments: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      ...this.toSummary(ticket),
      body: ticket.body,
      attachments: ticket.attachments.map((item) => this.toAttachment(item, ticket.id)),
      replies: ticket.replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        isStaff: reply.isStaff,
        authorName: reply.author.name || 'KIA.',
        createdAt: reply.createdAt.toISOString(),
        attachments: reply.attachments.map((item) => this.toAttachment(item, ticket.id)),
      })),
    };
  }

  async create(
    userId: string,
    dto: CreateTicketDto,
    files?: Express.Multer.File[],
  ): Promise<SupportTicketDetail> {
    this.assertNoCode(dto.subject);
    this.assertNoCode(dto.body);
    const safeFiles = this.attachments.assertFiles(files);

    let courseId = dto.courseId ?? null;
    if (!courseId && dto.courseSlug) {
      const course = await this.prisma.course.findUnique({
        where: { slug: dto.courseSlug },
        select: { id: true },
      });
      if (!course) {
        throw new NotFoundException(`Course ${dto.courseSlug} not found`);
      }
      courseId = course.id;
    }

    if (courseId) {
      const enrolled = await this.prisma.enrollment.findFirst({
        where: { userId, courseId },
      });
      if (!enrolled) {
        throw new ForbiddenException('You must be enrolled to open a course ticket');
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        courseId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        category: dto.category?.trim() || null,
        priority: dto.priority ?? 'NORMAL',
      },
    });

    if (safeFiles.length) {
      const saved = this.attachments.saveTicketFiles(ticket.id, safeFiles);
      await this.prisma.ticketAttachment.createMany({
        data: saved.map((file) => ({
          ticketId: ticket.id,
          replyId: null,
          fileName: file.fileName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        })),
      });
    }

    return this.getMine(userId, ticket.id);
  }

  async reply(
    userId: string,
    id: string,
    dto: TicketReplyDto,
    files?: Express.Multer.File[],
  ): Promise<SupportTicketDetail> {
    this.assertNoCode(dto.body);
    const safeFiles = this.attachments.assertFiles(files);

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === 'CLOSED') {
      throw new ForbiddenException('Ticket is closed');
    }

    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId: id,
        authorId: userId,
        body: dto.body.trim(),
        isStaff: false,
      },
    });

    if (safeFiles.length) {
      const saved = this.attachments.saveTicketFiles(ticket.id, safeFiles);
      await this.prisma.ticketAttachment.createMany({
        data: saved.map((file) => ({
          ticketId: ticket.id,
          replyId: reply.id,
          fileName: file.fileName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        })),
      });
    }

    if (ticket.status === 'RESOLVED') {
      await this.prisma.supportTicket.update({
        where: { id },
        data: { status: 'OPEN' },
      });
    }

    return this.getMine(userId, id);
  }

  private assertNoCode(value: string) {
    if (containsProgrammingCode(value)) {
      throw new BadRequestException('Programming code is not allowed in support messages');
    }
  }

  private toAttachment(
    item: {
      id: string;
      fileName: string;
      storedName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: Date;
    },
    ticketId: string,
  ): TicketAttachmentDto {
    return {
      id: item.id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      url: `/api/uploads/tickets/${ticketId}/${item.storedName}`,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private toSummary(ticket: {
    id: string;
    subject: string;
    status: SupportTicketSummary['status'];
    priority: SupportTicketSummary['priority'];
    category?: string | null;
    courseId: string | null;
    createdAt: Date;
    updatedAt: Date;
    course?: { id: string; slug: string; title: string } | null;
    _count: { replies: number };
  }): SupportTicketSummary {
    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category ?? null,
      courseId: ticket.courseId,
      courseSlug: ticket.course?.slug ?? null,
      courseTitle: ticket.course?.title ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      replyCount: ticket._count.replies,
    };
  }
}
