import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { isProductionEnv, SiteSettingsService } from '@kia./platform';
import {
  buildReadinessReport,
  readinessHttpStatus,
  settingsUnavailableReport,
  type ReadinessReport,
} from './readiness.report';

/**
 * Readiness for learner signup and checkout.
 * Liveness stays on GET /api/health (database only) so Docker does not
 * restart-loop a booting container whose SMS or payment gateway is not set.
 * This payload never includes secrets.
 */
@Controller()
export class ReadinessController {
  constructor(private readonly siteSettings: SiteSettingsService) {}

  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    let report: ReadinessReport;
    try {
      report = buildReadinessReport(await this.siteSettings.get());
    } catch {
      report = settingsUnavailableReport();
    }
    res.status(readinessHttpStatus(report.ready, isProductionEnv())).json(report);
  }
}
