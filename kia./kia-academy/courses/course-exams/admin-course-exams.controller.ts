import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AdminCourseExam } from '@kia./shared';
import { AdminAccess } from '@kia./platform';
import { Roles } from '@kia./platform';
import { AdminAccessGuard } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { CourseExamsService } from './course-exams.service';
import {
  AdminCreateCourseExamDto,
  AdminUpdateCourseExamDto,
  ReorderCoursesDto,
  ReorderLessonsDto,
} from './dto/course-exam.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
@Roles('ADMIN')
export class AdminCourseExamsController {
  constructor(private readonly courseExamsService: CourseExamsService) {}

  @Get('courses/reorder')
  @AdminAccess('courses', 'view')
  reorderCoursesHint() {
    // Route existence guard — actual reorder is under PATCH below.
    return { ok: true };
  }

  @Patch('courses/reorder')
  @AdminAccess('courses', 'edit')
  reorderCourses(@Body() dto: ReorderCoursesDto) {
    return this.courseExamsService.reorderCourses(dto.slugs);
  }

  @Patch('courses/:slug/lessons/reorder')
  @AdminAccess('courses', 'edit')
  reorderLessons(@Param('slug') slug: string, @Body() dto: ReorderLessonsDto) {
    return this.courseExamsService.reorderLessons(slug, dto.slugs);
  }

  @Get('courses/:slug/exams')
  @AdminAccess('courses', 'view')
  listExams(@Param('slug') slug: string): Promise<AdminCourseExam[]> {
    return this.courseExamsService.listForCourseAdmin(slug);
  }

  @Get('exams')
  @AdminAccess('courses', 'view')
  listAllExams(): Promise<AdminCourseExam[]> {
    return this.courseExamsService.listAllAdmin();
  }

  @Post('courses/:slug/exams')
  @AdminAccess('courses', 'manage')
  createExam(@Param('slug') slug: string, @Body() dto: AdminCreateCourseExamDto) {
    return this.courseExamsService.createAdmin(slug, dto);
  }

  @Patch('courses/:slug/exams/:examId')
  @AdminAccess('courses', 'edit')
  updateExam(
    @Param('slug') slug: string,
    @Param('examId') examId: string,
    @Body() dto: AdminUpdateCourseExamDto,
  ) {
    return this.courseExamsService.updateAdmin(slug, examId, dto);
  }

  @Delete('courses/:slug/exams/:examId')
  @AdminAccess('courses', 'manage')
  deleteExam(@Param('slug') slug: string, @Param('examId') examId: string) {
    return this.courseExamsService.deleteAdmin(slug, examId);
  }
}
