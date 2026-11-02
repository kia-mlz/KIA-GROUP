import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '@kia./shared';
import { CurrentUser, JwtAuthGuard } from '@kia./platform';
import { EducationalGamesService } from './educational-games.service';
import { HintDto, SubmitStageDto } from './dto/educational-game.dto';

@Controller('academy/games')
@UseGuards(JwtAuthGuard)
export class EducationalGamesController {
  constructor(private readonly games: EducationalGamesService) {}

  @Get('lessons/by-slug/:courseSlug/:lessonSlug')
  listForLesson(
    @CurrentUser() user: AuthUser,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.games.listForLesson(user.id, courseSlug, lessonSlug);
  }

  @Get('courses/:slug/summary')
  courseSummary(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.games.courseSummary(user.id, slug);
  }

  @Get('me/stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.games.stats(user.id);
  }

  @Get('me/history')
  history(@CurrentUser() user: AuthUser) {
    return this.games.history(user.id);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.games.leaderboard();
  }

  @Get('attempts/:attemptId')
  attempt(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
  ): ReturnType<EducationalGamesService['getAttempt']> {
    return this.games.getAttempt(user.id, attemptId);
  }

  @Get(':gameId')
  detail(@CurrentUser() user: AuthUser, @Param('gameId') gameId: string) {
    return this.games.getForLearner(user.id, gameId);
  }

  @Get(':gameId/progress')
  progress(@CurrentUser() user: AuthUser, @Param('gameId') gameId: string) {
    return this.games.progress(user.id, gameId);
  }

  @Post(':gameId/start')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  start(@CurrentUser() user: AuthUser, @Param('gameId') gameId: string) {
    return this.games.start(user.id, gameId);
  }

  @Post(':gameId/resume')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resume(@CurrentUser() user: AuthUser, @Param('gameId') gameId: string) {
    return this.games.resume(user.id, gameId);
  }

  @Post(':gameId/restart')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  restart(@CurrentUser() user: AuthUser, @Param('gameId') gameId: string) {
    return this.games.restart(user.id, gameId);
  }

  @Post(':gameId/stages/:stageId/submit')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('gameId') gameId: string,
    @Param('stageId') stageId: string,
    @Body() dto: SubmitStageDto,
  ) {
    return this.games.submit(user.id, gameId, stageId, dto.answer);
  }

  @Post(':gameId/stages/:stageId/hint')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  hint(
    @CurrentUser() user: AuthUser,
    @Param('gameId') gameId: string,
    @Param('stageId') stageId: string,
    @Body() dto: HintDto,
  ) {
    return this.games.hint(user.id, gameId, stageId, dto.index);
  }
}
