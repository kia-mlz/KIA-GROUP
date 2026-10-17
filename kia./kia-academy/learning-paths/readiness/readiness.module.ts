import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ProfileCompleteGuard } from '@kia./platform';
import { EmailModule } from '@kia./platform';
import { PersonalityModule } from '../../students/personality/personality.module';
import { SiteSettingsModule } from '@kia./platform';
import { TestBanksModule } from '../test-banks/test-banks.module';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

@Module({
  imports: [
    EmailModule,
    SiteSettingsModule,
    TestBanksModule,
    PersonalityModule,
    AssessmentsModule,
  ],
  controllers: [ReadinessController],
  providers: [ReadinessService, ProfileCompleteGuard],
  exports: [ReadinessService],
})
export class ReadinessModule {}
