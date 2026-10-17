import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssessmentAnswers, AssessmentResponse } from '@kia./shared';
import type { Prisma } from '@kia./platform';
import { PrismaService } from '@kia./platform';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssessmentDto, userId: string): Promise<AssessmentResponse> {
    const record = await this.prisma.assessment.create({
      data: {
        userId,
        answers: dto.answers as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toResponse(record);
  }

  async findOne(id: string, userId: string): Promise<AssessmentResponse> {
    const record = await this.prisma.assessment.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return this.toResponse(record);
  }

  async latestForUser(userId: string): Promise<AssessmentResponse | null> {
    const record = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return record ? this.toResponse(record) : null;
  }

  async findForUser(id: string, userId: string): Promise<AssessmentResponse | null> {
    const record = await this.prisma.assessment.findFirst({
      where: { id, userId },
    });
    return record ? this.toResponse(record) : null;
  }

  private toResponse(record: { id: string; answers: Prisma.JsonValue; createdAt: Date }): AssessmentResponse {
    return {
      id: record.id,
      answers: record.answers as unknown as AssessmentAnswers,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
