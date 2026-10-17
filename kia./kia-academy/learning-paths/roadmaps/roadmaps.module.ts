import { Module } from '@nestjs/common';
import { ProfileCompleteGuard } from '@kia./platform';
import { AssessmentsModule } from '../assessments/assessments.module';
import { SiteSettingsModule } from '@kia./platform';
import { RoadmapsController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';

@Module({
  imports: [SiteSettingsModule, AssessmentsModule],
  controllers: [RoadmapsController],
  providers: [RoadmapsService, ProfileCompleteGuard],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}
