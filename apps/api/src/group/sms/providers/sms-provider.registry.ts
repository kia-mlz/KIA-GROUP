import { Injectable } from '@nestjs/common';
import type { SiteSmsSettings, SmsProviderId } from '@kia./shared';
import { DevSmsProvider } from './dev.provider';
import { KavenegarSmsProvider } from './kavenegar.provider';
import type { SmsProvider } from './sms-provider';

/**
 * Resolves the active SmsProvider from site settings.
 * Add new Persian SMS vendors by implementing SmsProvider and registering here.
 */
@Injectable()
export class SmsProviderRegistry {
  private readonly dev = new DevSmsProvider();
  private readonly kavenegar = new KavenegarSmsProvider();

  resolve(settings: SiteSmsSettings): SmsProvider {
    return this.resolveById(settings.provider);
  }

  resolveById(id: SmsProviderId): SmsProvider {
    switch (id) {
      case 'kavenegar':
        return this.kavenegar;
      case 'dev':
      default:
        return this.dev;
    }
  }
}
