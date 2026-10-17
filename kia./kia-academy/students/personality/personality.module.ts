import { Module } from '@nestjs/common';
import { ProfileCompleteGuard } from '@kia./platform';
import { TestBanksModule } from '../../learning-paths/test-banks/test-banks.module';
import { PersonalityController } from './personality.controller';
import { PersonalityService } from './personality.service';

@Module({
  imports: [TestBanksModule],
  controllers: [PersonalityController],
  providers: [PersonalityService, ProfileCompleteGuard],
  exports: [PersonalityService],
})
export class PersonalityModule {}
