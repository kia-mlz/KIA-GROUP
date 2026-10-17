import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser, LearnerProgressSummary } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthUser): Promise<LearnerProgressSummary> {
    return this.progressService.getSummary(user.id);
  }
}
