import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { ChallengesService } from './challenges.service';
import { CreateChallengeSubmissionDto } from './dto/create-challenge-submission.dto';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChallengeSubmissionDto) {
    return this.challengesService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.challengesService.findOne(id, user.id);
  }
}
