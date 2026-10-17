import { Logger } from '@nestjs/common';
import type { SiteSmsSettings } from '@kia./shared';
import type { SmsOtpSendInput, SmsOtpSendResult, SmsProvider } from './sms-provider';

/**
 * Development SMS provider — never calls an external API.
 * Masks the phone in logs; never logs the OTP code.
 */
export class DevSmsProvider implements SmsProvider {
  readonly id = 'dev' as const;
  private readonly logger = new Logger(DevSmsProvider.name);

  async sendOtp(input: SmsOtpSendInput, _settings: SiteSmsSettings): Promise<SmsOtpSendResult> {
    const phone = input.phone;
    const masked =
      phone.length >= 4 ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : '****';
    this.logger.log(`[dev-sms] OTP would be sent to ${masked}`);
    return { simulated: true, messageId: null };
  }
}
