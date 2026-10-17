import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateLearnerMessageDto,
  LearnerMessageDto,
} from '@kia./shared';
import { containsProgrammingCode } from '@kia./shared';
import { PrismaService } from '@kia./platform';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForLearner(userId: string): Promise<LearnerMessageDto[]> {
    const messages = await this.prisma.learnerMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return messages.map((message) => this.toDto(message));
  }

  async markRead(userId: string, id: string): Promise<LearnerMessageDto> {
    const message = await this.prisma.learnerMessage.findUnique({ where: { id } });
    if (!message || message.userId !== userId) {
      throw new NotFoundException('Message not found');
    }
    if (message.readAt) {
      return this.toDto(message);
    }
    const updated = await this.prisma.learnerMessage.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toDto(updated);
  }

  async adminCreate(
    actorId: string,
    dto: CreateLearnerMessageDto,
  ): Promise<LearnerMessageDto> {
    if (containsProgrammingCode(dto.subject) || containsProgrammingCode(dto.body)) {
      throw new BadRequestException('Programming code is not allowed in messages');
    }
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const message = await this.prisma.learnerMessage.create({
      data: {
        userId: dto.userId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        createdBy: actorId,
      },
    });
    return this.toDto(message);
  }

  private toDto(message: {
    id: string;
    subject: string;
    body: string;
    readAt: Date | null;
    createdAt: Date;
  }): LearnerMessageDto {
    return {
      id: message.id,
      subject: message.subject,
      body: message.body,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
