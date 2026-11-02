import { Module } from '@nestjs/common';
import { AdminAccessGuard, RolesGuard, SiteSettingsModule } from '@kia./platform';
import { AdminEducationalGamesController } from './admin-educational-games.controller';
import { EducationalGamesController } from './educational-games.controller';
import { EducationalGamesService } from './educational-games.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [EducationalGamesController, AdminEducationalGamesController],
  providers: [EducationalGamesService, RolesGuard, AdminAccessGuard],
  exports: [EducationalGamesService],
})
export class EducationalGamesModule {}
