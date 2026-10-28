import type { SitePaymentSettings, SiteSettings, SiteSmsSettings } from '@kia./shared';

export type ReadinessReason =
  | 'ok'
  | 'disabled'
  | 'dev_provider'
  | 'missing_credentials'
  | 'settings_unavailable';

export interface ReadinessCheck {
  ok: boolean;
  provider: string;
  enabled: boolean;
  reason: ReadinessReason;
}

/**
 * Public readiness payload. Must never include API keys, merchant ids,
 * sender lines, templates, or callback URLs.
 */
export interface ReadinessReport {
  status: 'ready' | 'not_ready';
  ready: boolean;
  checks: {
    sms: ReadinessCheck;
    payment: ReadinessCheck;
  };
  timestamp: string;
}

function assessSms(sms: SiteSmsSettings): ReadinessCheck {
  const provider = sms.provider;
  const enabled = sms.enabled;
  if (!enabled) return { ok: false, provider, enabled, reason: 'disabled' };
  if (provider !== 'kavenegar') {
    return { ok: false, provider, enabled, reason: 'dev_provider' };
  }
  if (!sms.apiKey.trim() || !sms.template.trim()) {
    return { ok: false, provider, enabled, reason: 'missing_credentials' };
  }
  return { ok: true, provider, enabled, reason: 'ok' };
}

function assessPayment(payment: SitePaymentSettings): ReadinessCheck {
  const provider = payment.provider;
  const enabled = payment.enabled;
  if (!enabled) return { ok: false, provider, enabled, reason: 'disabled' };
  if (provider === 'dev') {
    return { ok: false, provider, enabled, reason: 'dev_provider' };
  }
  const hasCredentials =
    provider === 'stripe'
      ? payment.apiKey.trim().length > 0
      : payment.merchantId.trim().length > 0;
  if (!hasCredentials) {
    return { ok: false, provider, enabled, reason: 'missing_credentials' };
  }
  return { ok: true, provider, enabled, reason: 'ok' };
}

export function buildReadinessReport(settings: SiteSettings, now = new Date()): ReadinessReport {
  const sms = assessSms(settings.sms);
  const payment = assessPayment(settings.payment);
  const ready = sms.ok && payment.ok;
  return {
    status: ready ? 'ready' : 'not_ready',
    ready,
    checks: { sms, payment },
    timestamp: now.toISOString(),
  };
}

export function settingsUnavailableReport(now = new Date()): ReadinessReport {
  const check: ReadinessCheck = {
    ok: false,
    provider: 'unknown',
    enabled: false,
    reason: 'settings_unavailable',
  };
  return {
    status: 'not_ready',
    ready: false,
    checks: { sms: { ...check }, payment: { ...check } },
    timestamp: now.toISOString(),
  };
}

/** Production fails closed. Development (and test) always answers 200. */
export function readinessHttpStatus(ready: boolean, production: boolean): 200 | 503 {
  return production && !ready ? 503 : 200;
}
