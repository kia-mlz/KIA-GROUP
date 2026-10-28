import { createDefaultSiteSettings, type SiteSettings } from '@kia./shared';
import type { SiteSettingsService } from '@kia./platform';
import { ReadinessController } from './readiness.controller';

const SECRET_KEY = 'kavenegar-api-key-MUST-NOT-LEAK';
const SECRET_TEMPLATE = 'verify-template-MUST-NOT-LEAK';
const SECRET_MERCHANT = 'merchant-id-MUST-NOT-LEAK';
const SECRET_DB = 'super-secret-db-password';

describe('ReadinessController', () => {
  const originalEnv = process.env.NODE_ENV;
  let settings: SiteSettings;
  let siteSettings: { get: jest.Mock };

  beforeEach(() => {
    settings = createDefaultSiteSettings();
    siteSettings = { get: jest.fn(async () => settings) };
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  function createController() {
    return new ReadinessController(siteSettings as unknown as SiteSettingsService);
  }

  function mockRes() {
    const res = {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
    return res;
  }

  function configureReady() {
    settings.sms.enabled = true;
    settings.sms.provider = 'kavenegar';
    settings.sms.apiKey = SECRET_KEY;
    settings.sms.template = SECRET_TEMPLATE;
    settings.payment.enabled = true;
    settings.payment.provider = 'zarinpal';
    settings.payment.merchantId = SECRET_MERCHANT;
    settings.payment.apiKey = SECRET_KEY;
  }

  it('returns 200 in development when signup and payment cannot work', async () => {
    const res = mockRes();
    await createController().ready(res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'not_ready',
      ready: false,
      checks: {
        sms: { ok: false, provider: 'dev', enabled: false, reason: 'disabled' },
        payment: { ok: false, provider: 'dev', enabled: true, reason: 'dev_provider' },
      },
    });
  });

  it('returns 503 in production when SMS is dev or payment is dev', async () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    await createController().ready(res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ status: 'not_ready', ready: false });
  });

  it('returns 200 in production when SMS is a real provider and payment is not dev', async () => {
    process.env.NODE_ENV = 'production';
    configureReady();
    const res = mockRes();
    await createController().ready(res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      ready: true,
      checks: {
        sms: { ok: true, provider: 'kavenegar', enabled: true, reason: 'ok' },
        payment: { ok: true, provider: 'zarinpal', enabled: true, reason: 'ok' },
      },
    });
  });

  it('does not leak API keys, templates, or merchant ids', async () => {
    configureReady();
    settings.sms.apiKey = '';
    const res = mockRes();
    await createController().ready(res as never);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(SECRET_KEY);
    expect(serialized).not.toContain(SECRET_TEMPLATE);
    expect(serialized).not.toContain(SECRET_MERCHANT);
    expect(res.body).toMatchObject({
      checks: { sms: { ok: false, reason: 'missing_credentials', provider: 'kavenegar' } },
    });
  });

  it('returns 503 in production when settings cannot be read, without the error text', async () => {
    process.env.NODE_ENV = 'production';
    siteSettings.get.mockRejectedValue(
      new Error(`connect ECONNREFUSED postgres://kia_academy:${SECRET_DB}@postgres:5432`),
    );
    const res = mockRes();
    await createController().ready(res as never);
    expect(res.statusCode).toBe(503);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(SECRET_DB);
    expect(serialized).not.toContain('ECONNREFUSED');
    expect(res.body).toMatchObject({
      status: 'not_ready',
      ready: false,
      checks: {
        sms: { reason: 'settings_unavailable' },
        payment: { reason: 'settings_unavailable' },
      },
    });
  });

  it('returns 200 in development when settings cannot be read', async () => {
    siteSettings.get.mockRejectedValue(new Error(`password=${SECRET_DB}`));
    const res = mockRes();
    await createController().ready(res as never);
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(SECRET_DB);
  });
});
