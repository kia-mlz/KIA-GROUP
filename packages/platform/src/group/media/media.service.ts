import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { isFreePreviewLessonIndex } from '@kia./shared';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { resolveUnderRoot } from '../../common/utils/safe-path';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaStorageService } from './media-storage.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private videoSigningSecret(): string {
    // Prefer dedicated secret when set; otherwise reuse the access JWT secret.
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      this.configService.getOrThrow<string>('JWT_SECRET')
    );
  }

  async streamLessonVideo(
    lessonId: string,
    filename: string,
    userId: string | null,
    res: Response,
  ): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });
    if (!lesson?.course) {
      throw new NotFoundException('Lesson not found');
    }

    const siblings = await this.prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    const lessonIndex = siblings.findIndex((entry) => entry.id === lessonId);
    const freePreview = isFreePreviewLessonIndex(lessonIndex);

    if (!freePreview) {
      const entitlement = await this.prisma.entitlement.findFirst({
        where: {
          userId,
          resourceType: 'course',
          resourceId: lesson.course.slug,
        },
      });
      if (!entitlement) {
        throw new UnauthorizedException('Course access required');
      }
    }

    const expectedPrefix = `/api/uploads/lessons/${lessonId}/`;
    if (!lesson.videoUrl?.startsWith(expectedPrefix)) {
      throw new NotFoundException('Video not found');
    }

    const absolute = resolveUnderRoot(
      this.mediaStorage.uploadsRoot,
      'lessons',
      lessonId,
      filename,
    );
    if (!existsSync(absolute)) {
      throw new NotFoundException('Video file not found');
    }

    // Bound Content-Type to the stored filename extension only.
    res.setHeader('Content-Type', this.guessContentType(filename));
    createReadStream(absolute).pipe(res);
  }

  createSignedVideoUrl(lessonId: string, filename: string, userId: string): string {
    const token = this.jwtService.sign(
      { sub: userId, lessonId, filename, type: 'lesson-video' },
      {
        secret: this.videoSigningSecret(),
        expiresIn: '1h',
      },
    );
    return `/api/media/lessons/${lessonId}/${filename}?token=${encodeURIComponent(token)}`;
  }

  async streamLessonVideoWithToken(
    lessonId: string,
    filename: string,
    token: string,
    res: Response,
  ): Promise<void> {
    let payload: { sub?: string; lessonId?: string; filename?: string; type?: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.videoSigningSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired video token');
    }

    if (
      payload.type !== 'lesson-video' ||
      payload.lessonId !== lessonId ||
      payload.filename !== filename ||
      !payload.sub
    ) {
      throw new BadRequestException('Invalid video token');
    }

    await this.streamLessonVideo(lessonId, filename, payload.sub, res);
  }

  private guessContentType(filename: string): string {
    if (filename.endsWith('.webm')) return 'video/webm';
    if (filename.endsWith('.ogg')) return 'video/ogg';
    if (filename.endsWith('.mov')) return 'video/quicktime';
    if (filename.endsWith('.m4v')) return 'video/x-m4v';
    return 'video/mp4';
  }
}
