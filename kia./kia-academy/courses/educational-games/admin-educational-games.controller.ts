import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAccess, AdminAccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@kia./platform';
import { EducationalGamesService } from './educational-games.service';
import {
  AssignChapterDto,
  CreateChapterDto,
  ReorderGamesDto,
  UpdateEducationalGameDto,
  UpsertEducationalGameDto,
} from './dto/educational-game.dto';

@Controller('admin/academy')
@UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
@Roles('ADMIN')
export class AdminEducationalGamesController {
  constructor(private readonly games: EducationalGamesService) {}

  @Get('games/dashboard')
  @AdminAccess('educationalGames', 'view')
  dashboard() {
    return this.games.dashboard();
  }

  @Get('games/catalog')
  @AdminAccess('educationalGames', 'view')
  catalog() {
    return this.games.catalog();
  }

  @Get('games')
  @AdminAccess('educationalGames', 'view')
  list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('lessonId') lessonId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.games.listAdmin({ status, type, q, lessonId, courseId });
  }

  @Post('games')
  @AdminAccess('educationalGames', 'manage')
  create(@Body() dto: UpsertEducationalGameDto) {
    return this.games.create(dto);
  }

  @Patch('games/reorder')
  @AdminAccess('educationalGames', 'edit')
  reorder(@Body() dto: ReorderGamesDto) {
    return this.games.reorder(dto);
  }

  @Get('games/:id')
  @AdminAccess('educationalGames', 'view')
  get(@Param('id') id: string) {
    return this.games.getAdmin(id);
  }

  @Patch('games/:id')
  @AdminAccess('educationalGames', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateEducationalGameDto) {
    return this.games.update(id, dto);
  }

  @Post('games/:id/duplicate')
  @AdminAccess('educationalGames', 'manage')
  duplicate(@Param('id') id: string) {
    return this.games.duplicate(id);
  }

  @Post('games/:id/publish')
  @AdminAccess('educationalGames', 'edit')
  publish(@Param('id') id: string) {
    return this.games.setPublished(id, true);
  }

  @Post('games/:id/unpublish')
  @AdminAccess('educationalGames', 'edit')
  unpublish(@Param('id') id: string) {
    return this.games.setPublished(id, false);
  }

  @Delete('games/:id')
  @AdminAccess('educationalGames', 'manage')
  remove(@Param('id') id: string) {
    return this.games.remove(id);
  }

  @Get('games/:id/results')
  @AdminAccess('educationalGames', 'view')
  results(@Param('id') id: string) {
    return this.games.results(id);
  }

  @Post('chapters')
  @AdminAccess('educationalGames', 'manage')
  createChapter(@Body() dto: CreateChapterDto) {
    return this.games.createChapter(dto);
  }

  @Patch('lessons/:lessonId/chapter')
  @AdminAccess('educationalGames', 'edit')
  assignChapter(@Param('lessonId') lessonId: string, @Body() dto: AssignChapterDto) {
    return this.games.assignChapter(lessonId, dto.chapterId ?? null);
  }
}
