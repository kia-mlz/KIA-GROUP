import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SiteSettingsService } from '@kia./platform';
import { isProductionEnv } from '@kia./platform';
import { SmsProviderRegistry } from './providers/sms-provider.registry';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly siteSettings: SiteSettingsService,
    private readonly registry: SmsProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Deliver an OTP code via the configured SMS provider.
   * In non-production with OTP_DEV_EXPOSE, delivery may be skipped when SMS is disabled.
   * In production, a real (non-dev) provider must be enabled and configured.
   */
  async sendOtp(phone: string, code: string): Promise<{ simulated: boolean }> {
    const settings = await this.siteSettings.get();
    const sms = settings.sms;
    const isProduction = isProductionEnv();
    const expose =
      !isProduction && this.configService.get<string>('OTP_DEV_EXPOSE') === 'true';

    if (!sms.enabled) {
      if (isProduction) {
        throw new ServiceUnavailableException(
          'SMS/OTP delivery is not configured. Enable OTP/SMS settings in the admin panel.',
        );
      }
      if (expose) {
        this.logger.warn('[sms] disabled — relying on OTP_DEV_EXPOSE for local delivery');
        return { simulated: true };
      }
      throw new ServiceUnavailableException(
        'SMS/OTP is disabled. Enable it in Admin → OTP/SMS settings, or set OTP_DEV_EXPOSE=true for local development.',
      );
    }

    if (isProduction && sms.provider === 'dev') {
      throw new ServiceUnavailableException(
        'Production cannot use the dev SMS provider. Configure Kavenegar (or another provider) in Admin → OTP/SMS settings.',
      );
    }

    if (sms.provider === 'kavenegar') {
      if (!sms.apiKey.trim()) {
        throw new BadRequestException('Kavenegar API key is required');
      }
      if (!sms.template.trim()) {
        throw new BadRequestException('Kavenegar verify template name is required');
      }
    }

    const provider = this.registry.resolve(sms);
    const result = await provider.sendOtp({ phone, code }, sms);
    return { simulated: Boolean(result.simulated) };
  }
}
