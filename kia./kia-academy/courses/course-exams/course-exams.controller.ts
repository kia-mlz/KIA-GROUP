import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { CourseExamsService } from './course-exams.service';
import { SaveCourseExamAnswersDto } from './dto/course-exam.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CourseExamsController {
  constructor(private readonly courseExamsService: CourseExamsService) {}

  @Get('exams/mine')
  listMyExams(@CurrentUser() user: AuthUser) {
    return this.courseExamsService.listMyExams(user.id);
  }

  @Get(':slug/exams')
  listExams(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.courseExamsService.listForLearner(user.id, slug);
  }

  @Get('exams/:examId/attempts')
  listAttempts(@CurrentUser() user: AuthUser, @Param('examId') examId: string) {
    return this.courseExamsService.listAttemptsLearner(user.id, examId);
  }

  @Post('exams/:examId/start')
  startAttempt(@CurrentUser() user: AuthUser, @Param('examId') examId: string) {
    return this.courseExamsService.startAttempt(user.id, examId);
  }

  @Patch('exams/:examId/attempts/:attemptId/answers')
  saveAnswers(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveCourseExamAnswersDto,
  ) {
    return this.courseExamsService.saveAnswers(user.id, attemptId, dto);
  }

  @Post('exams/:examId/attempts/:attemptId/submit')
  submitAttempt(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
    @Body() dto?: SaveCourseExamAnswersDto,
  ) {
    return this.courseExamsService.submitAttempt(user.id, attemptId, dto);
  }

  @Get('exams/:examId/attempts/:attemptId')
  getResult(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.courseExamsService.getAttemptResult(user.id, attemptId);
  }
}
