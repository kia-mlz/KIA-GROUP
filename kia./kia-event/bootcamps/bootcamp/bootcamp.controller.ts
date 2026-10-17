import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { BootcampService } from './bootcamp.service';

@Controller('bootcamp')
export class BootcampController {
  constructor(private readonly bootcampService: BootcampService) {}

  @Get('leaderboard')
  getLeaderboard() {
    return this.bootcampService.getLeaderboard();
  }

  @Get('state')
  @UseGuards(JwtAuthGuard)
  getState(@CurrentUser() user: AuthUser) {
    return this.bootcampService.getState(user.id);
  }
}
