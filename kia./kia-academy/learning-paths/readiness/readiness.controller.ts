import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthUser, LearnerTestReport, ReadinessTestSummary } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { ProfileCompleteGuard } from '@kia./platform';
import { ReadinessService } from './readiness.service';
import { CreateReadinessTestDto } from './dto/create-readiness-test.dto';
import { SaveExamAnswersDto, StartExamDto, SubmitExamDto } from './dto/exam.dto';

@Controller('readiness')
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Post('exam/start')
  startExam(@CurrentUser() user: AuthUser, @Body() dto: StartExamDto) {
    return this.readinessService.startExam(user.id, dto.roadmapId);
  }

  @Patch('exam/:attemptId/answers')
  saveAnswers(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveExamAnswersDto,
  ) {
    return this.readinessService.saveAnswers(attemptId, user.id, dto.answers);
  }

  @Post('exam/:attemptId/submit')
  submitExam(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.readinessService.submitExam(attemptId, user.id, dto.answers);
  }

  @Get('exam/:attemptId')
  getExam(@CurrentUser() user: AuthUser, @Param('attemptId') attemptId: string) {
    return this.readinessService.getExamAttempt(attemptId, user.id);
  }

  /** Full three-test report (personality + assessment + readiness). */
  @Get('report')
  report(
    @CurrentUser() user: AuthUser,
    @Query('examAttemptId') examAttemptId?: string,
  ): Promise<LearnerTestReport> {
    return this.readinessService.getTestReport(user.id, examAttemptId);
  }

  /** Legacy client-scored create — prefer exam/start + exam/submit. */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReadinessTestDto) {
    return this.readinessService.create(dto, user.id);
  }

  @Get()
  listMine(@CurrentUser() user: AuthUser): Promise<ReadinessTestSummary[]> {
    return this.readinessService.listForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.readinessService.findOne(id, user.id);
  }
}
