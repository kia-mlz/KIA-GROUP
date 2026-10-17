import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTodoDto, LearnerTodoDto, UpdateTodoDto } from '@kia./shared';
import { PrismaService } from '@kia./platform';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<LearnerTodoDto[]> {
    const todos = await this.prisma.learnerTodo.findMany({
      where: { userId },
      orderBy: [{ done: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return todos.map((todo) => this.toDto(todo));
  }

  async create(userId: string, dto: CreateTodoDto): Promise<LearnerTodoDto> {
    const count = await this.prisma.learnerTodo.count({ where: { userId } });
    const todo = await this.prisma.learnerTodo.create({
      data: {
        userId,
        title: dto.title.trim(),
        sortOrder: count,
      },
    });
    return this.toDto(todo);
  }

  async update(userId: string, id: string, dto: UpdateTodoDto): Promise<LearnerTodoDto> {
    const existing = await this.prisma.learnerTodo.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Todo not found');
    }

    const todo = await this.prisma.learnerTodo.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.done !== undefined ? { done: dto.done } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.toDto(todo);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.learnerTodo.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Todo not found');
    }
    await this.prisma.learnerTodo.delete({ where: { id } });
  }

  private toDto(todo: {
    id: string;
    title: string;
    done: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): LearnerTodoDto {
    return {
      id: todo.id,
      title: todo.title,
      done: todo.done,
      sortOrder: todo.sortOrder,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }
}
