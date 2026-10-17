import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, CourseSummary, LessonDetail, LessonSummary } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { OptionalJwtAuthGuard } from '@kia./platform';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@CurrentUser() user: AuthUser | null): Promise<CourseSummary[]> {
    return this.coursesService.listCourses(user?.id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthUser): Promise<CourseSummary[]> {
    return this.coursesService.listMyCourses(user.id);
  }

  @Get(':slug/attachments')
  @UseGuards(JwtAuthGuard)
  listAttachments(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ) {
    return this.coursesService.listAttachments(user.id, slug);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  getCourse(
    @CurrentUser() user: AuthUser | null,
    @Param('slug') slug: string,
  ): Promise<CourseSummary & { lessons: LessonSummary[] }> {
    return this.coursesService.getCourse(user?.id, slug);
  }

  @Get(':slug/lessons/:lessonSlug')
  @UseGuards(JwtAuthGuard)
  getLesson(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
  ): Promise<LessonDetail> {
    return this.coursesService.getLesson(user.id, slug, lessonSlug);
  }

  @Post(':slug/enroll')
  @UseGuards(JwtAuthGuard)
  enroll(@CurrentUser() user: AuthUser, @Param('slug') slug: string): Promise<CourseSummary> {
    return this.coursesService.enroll(user.id, slug);
  }

  @Post(':slug/lessons/:lessonSlug/complete')
  @UseGuards(JwtAuthGuard)
  completeLesson(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Param('lessonSlug') lessonSlug: string,
  ): Promise<LessonSummary> {
    return this.coursesService.markComplete(user.id, slug, lessonSlug);
  }
}
