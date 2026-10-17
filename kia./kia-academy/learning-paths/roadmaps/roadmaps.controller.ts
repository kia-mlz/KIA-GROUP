import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { ProfileCompleteGuard } from '@kia./platform';
import { RoadmapsService } from './roadmaps.service';
import { CreateRoadmapDto } from './dto/create-roadmap.dto';

@Controller('roadmaps')
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoadmapDto) {
    return this.roadmapsService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roadmapsService.findOne(id, user.id);
  }

  @Post(':id/enroll')
  enroll(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roadmapsService.enroll(id, user.id);
  }
}
