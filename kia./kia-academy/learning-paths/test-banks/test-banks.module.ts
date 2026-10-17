import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { SiteSettingsModule } from '@kia./platform';
import { AdminTestBanksController } from './admin-test-banks.controller';
import { TestBanksController } from './test-banks.controller';
import { TestBanksService } from './test-banks.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [TestBanksController, AdminTestBanksController],
  providers: [TestBanksService, RolesGuard, AdminAccessGuard],
  exports: [TestBanksService],
})
export class TestBanksModule {}
