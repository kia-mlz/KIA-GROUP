import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDefaultSiteSettings, type SiteSettings } from '@kia./shared';
import { SmsService } from './sms.service';
import type { SmsProviderRegistry } from './providers/sms-provider.registry';
import type { SiteSettingsService } from '@kia./platform';

describe('SmsService', () => {
  let settings: SiteSettings;
  let siteSettings: { get: jest.Mock };
  let sendOtp: jest.Mock;
  let registry: { resolve: jest.Mock };
  let config: { get: jest.Mock };
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    settings = createDefaultSiteSettings();
    siteSettings = { get: jest.fn(async () => settings) };
    sendOtp = jest.fn(async () => ({ simulated: false, messageId: '1' }));
    registry = {
      resolve: jest.fn(() => ({ id: 'kavenegar', sendOtp })),
    };
    config = { get: jest.fn(() => 'true') };
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  function createService() {
    return new SmsService(
      siteSettings as unknown as SiteSettingsService,
      registry as unknown as SmsProviderRegistry,
      config as unknown as ConfigService,
    );
  }

  it('allows local OTP_DEV_EXPOSE when SMS is disabled', async () => {
    settings.sms.enabled = false;
    const result = await createService().sendOtp('09121234567', '123456');
    expect(result.simulated).toBe(true);
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('rejects production when SMS is disabled', async () => {
    process.env.NODE_ENV = 'production';
    settings.sms.enabled = false;
    await expect(createService().sendOtp('09121234567', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects production when provider is still dev', async () => {
    process.env.NODE_ENV = 'production';
    settings.sms.enabled = true;
    settings.sms.provider = 'dev';
    await expect(createService().sendOtp('09121234567', '123456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('requires Kavenegar credentials when enabled', async () => {
    settings.sms.enabled = true;
    settings.sms.provider = 'kavenegar';
    settings.sms.apiKey = '';
    settings.sms.template = 'verify';
    await expect(createService().sendOtp('09121234567', '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('delegates to the registry when configured', async () => {
    settings.sms.enabled = true;
    settings.sms.provider = 'kavenegar';
    settings.sms.apiKey = 'test-key';
    settings.sms.template = 'verify';
    const result = await createService().sendOtp('09121234567', '123456');
    expect(result.simulated).toBe(false);
    expect(registry.resolve).toHaveBeenCalled();
    expect(sendOtp).toHaveBeenCalledWith(
      { phone: '09121234567', code: '123456' },
      settings.sms,
    );
  });
});
