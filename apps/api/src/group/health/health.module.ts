import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '@kia./platform';
import { HealthController } from './health.controller';
import { ReadinessController } from './readiness.controller';

@Module({
  imports: [SiteSettingsModule],
  controllers: [HealthController, ReadinessController],
})
export class HealthModule {}
