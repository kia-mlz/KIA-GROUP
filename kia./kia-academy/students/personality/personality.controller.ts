import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, PersonalityResult } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { ProfileCompleteGuard } from '@kia./platform';
import { SubmitPersonalityDto } from './dto/submit-personality.dto';
import { PersonalityService } from './personality.service';

@Controller('personality')
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
export class PersonalityController {
  constructor(private readonly personalityService: PersonalityService) {}

  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitPersonalityDto,
  ): Promise<PersonalityResult> {
    return this.personalityService.submit(user.id, dto.answers);
  }

  @Get('latest')
  latest(@CurrentUser() user: AuthUser): Promise<PersonalityResult | null> {
    return this.personalityService.latestForUser(user.id);
  }
}
