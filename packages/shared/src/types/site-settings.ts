/** Site-wide settings editable from the admin panel. */

import { normalizeAdminAccess, type SiteAdminAccessSettings } from '@kia./permissions';

// The admin-panel access model lives in `@kia./permissions` (one home
// for the permission model across the ecosystem); re-exported here so every
// existing consumer of the shared package keeps working unchanged.
export type {
  AdminAccessSection,
  AdminSectionPermission,
  SiteAdminAccessSettings,
} from '@kia./permissions';
export {
  adminSectionAllowed,
  createSectionPermission,
  normalizeAdminAccess,
  normalizeAdminSectionPermission,
  resolveModeratorAdminAccess,
  resolveStaffAdminAccess,
} from '@kia./permissions';

export interface SiteGeneralSettings {
  siteName: string;
  tagline: string;
  heroMinutes: number;
  heroRoadmapsCount: number;
  heroMatchPercent: number;
  supportEmail: string;
}

export interface SitePricingSettings {
  readinessTestCents: number;
  courseCents: number;
  /** Per-module prices in Iranian Rials (IRR). */
  modulePrices: number[];
  /** Bundle discount as percent, e.g. 20 = 20% off. */
  bundleDiscountPercent: number;
  /** Per-course price overrides in IRR, keyed by course slug. */
  coursePrices: Record<string, number>;
}

export interface SiteTrackSettings {
  key: string;
  name: string;
  icon: string;
  description: string;
  modules: string[];
}

export interface SiteReadinessSettings {
  passThreshold: number;
  passTitle: string;
  passMessage: string;
  failTitle: string;
  failMessage: string;
}

export interface SiteBootcampSettings {
  unlockScoreThreshold: number;
  unlockCourseSlug: string;
  defaultRank: number;
  defaultPoints: number;
}

/** Third-party / gateway payment configuration (super-admin editable). */
export type PaymentProviderId = 'dev' | 'zarinpal' | 'idpay' | 'stripe';

/** Display / gateway preference. Ledger amounts remain stored in IRR. */
export type PaymentCurrencyCode = 'irr' | 'irt';

export interface SitePaymentSettings {
  /** Master switch — when false, checkout is rejected. */
  enabled: boolean;
  /** Active checkout provider. `dev` completes in-app without a gateway. */
  provider: PaymentProviderId;
  /** Catalog / display currency. Amounts are always stored in IRR. */
  currency: PaymentCurrencyCode;
  /** Merchant / terminal id for Zarinpal, IDPay, etc. */
  merchantId: string;
  /** Optional API key / access token for the provider. */
  apiKey: string;
  /** Use provider sandbox / test mode when supported. */
  sandbox: boolean;
  /** Public label shown on the payment review page. */
  displayName: string;
  /** Optional public description for the active gateway. */
  description: string;
  /** Absolute or path callback URL (gateway verify return). Empty → APP_URL default. */
  callbackUrl: string;
  /** Absolute or path success redirect. Empty → /checkout/success. */
  successUrl: string;
  /** Absolute or path failure redirect. Empty → /checkout/cancel. */
  failureUrl: string;
}

/**
 * OTP / SMS provider configuration (super-admin editable).
 * Kavenegar verify/lookup needs apiKey + approved template name; sender is optional.
 */
export type SmsProviderId = 'dev' | 'kavenegar';

export interface SiteSmsSettings {
  /** Master switch — when false, OTP SMS is not sent (dev expose may still apply). */
  enabled: boolean;
  /** Active SMS provider. `dev` logs only (no network send). */
  provider: SmsProviderId;
  /** Provider API key (Kavenegar API-KEY). Never expose publicly. */
  apiKey: string;
  /**
   * Optional sender line / number. Not required for Kavenegar verify/lookup
   * (system line is used); kept for providers that need an explicit sender.
   */
  sender: string;
  /**
   * Kavenegar verify/lookup template name (must be approved in the panel).
   * Template should include `%token%` for the OTP code.
   */
  template: string;
}

/**
 * Enamad (نماد اعتماد الکترونیکی) trust-seal configuration.
 * Badge is built from id + code — never inject arbitrary HTML from admin.
 */
export interface SiteEnamadSettings {
  enabled: boolean;
  /** `id` query param from the Enamad panel snippet. */
  codeId: string;
  /** `Code` query param from the Enamad panel snippet. */
  code: string;
}

export function normalizePaymentSettings(raw: unknown): SitePaymentSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const providerRaw = String(source.provider ?? 'dev');
  const provider: PaymentProviderId =
    providerRaw === 'zarinpal' ||
    providerRaw === 'idpay' ||
    providerRaw === 'stripe' ||
    providerRaw === 'dev'
      ? providerRaw
      : 'dev';
  const currencyRaw = String(source.currency ?? 'irr').toLowerCase();
  const currency: PaymentCurrencyCode =
    currencyRaw === 'irt' || currencyRaw === 'toman' ? 'irt' : 'irr';
  return {
    enabled: source.enabled !== false,
    provider,
    currency,
    merchantId: String(source.merchantId ?? ''),
    apiKey: String(source.apiKey ?? ''),
    sandbox: source.sandbox !== false,
    displayName: String(source.displayName ?? ''),
    description: String(source.description ?? ''),
    callbackUrl: String(source.callbackUrl ?? ''),
    successUrl: String(source.successUrl ?? ''),
    failureUrl: String(source.failureUrl ?? ''),
  };
}

export function normalizeSmsSettings(raw: unknown): SiteSmsSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const providerRaw = String(source.provider ?? 'dev');
  const provider: SmsProviderId = providerRaw === 'kavenegar' ? 'kavenegar' : 'dev';
  return {
    enabled: source.enabled === true,
    provider,
    apiKey: String(source.apiKey ?? ''),
    sender: String(source.sender ?? ''),
    template: String(source.template ?? ''),
  };
}

export function normalizeEnamadSettings(raw: unknown): SiteEnamadSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: source.enabled === true,
    codeId: String(source.codeId ?? '').trim(),
    code: String(source.code ?? '').trim(),
  };
}

/** Safe Enamad trustseal URLs when id + code are configured. */
export function buildEnamadBadgeUrls(settings: SiteEnamadSettings): {
  href: string;
  imgSrc: string;
} | null {
  const codeId = settings.codeId.trim();
  const code = settings.code.trim();
  if (!settings.enabled || !codeId || !code) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(codeId) || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  const qs = `id=${encodeURIComponent(codeId)}&Code=${encodeURIComponent(code)}`;
  return {
    href: `https://trustseal.enamad.ir/?${qs}`,
    imgSrc: `https://trustseal.enamad.ir/logo.aspx?${qs}`,
  };
}

export interface SiteSettings {
  general: SiteGeneralSettings;
  pricing: SitePricingSettings;
  tracks: SiteTrackSettings[];
  readiness: SiteReadinessSettings;
  bootcamp: SiteBootcampSettings;
  payment: SitePaymentSettings;
  sms: SiteSmsSettings;
  enamad: SiteEnamadSettings;
  adminAccess: SiteAdminAccessSettings;
}

/**
 * Strip secrets and admin policy from settings exposed on public GET /settings.
 * Merchant/API keys must never leave the admin API.
 */
export function toPublicSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    payment: {
      ...settings.payment,
      merchantId: '',
      apiKey: '',
    },
    sms: {
      ...settings.sms,
      apiKey: '',
    },
    adminAccess: normalizeAdminAccess({}),
  };
}

export type SiteSettingsSection = keyof SiteSettings;

/**
 * Price for a course in IRR: the per-course override (coursePrices[slug]) wins,
 * otherwise the global catalog price (courseCents).
 */
export function coursePriceCents(
  pricing: Pick<SitePricingSettings, 'courseCents' | 'coursePrices'>,
  slug: string,
): number {
  const override = pricing.coursePrices?.[slug];
  if (typeof override === 'number' && override >= 0) return override;
  return pricing.courseCents;
}

export interface UpdateSiteSettingsDto {
  general?: Partial<SiteGeneralSettings>;
  pricing?: Partial<SitePricingSettings>;
  tracks?: SiteTrackSettings[];
  readiness?: Partial<SiteReadinessSettings>;
  bootcamp?: Partial<SiteBootcampSettings>;
  payment?: Partial<SitePaymentSettings>;
  sms?: Partial<SiteSmsSettings>;
  enamad?: Partial<SiteEnamadSettings>;
  adminAccess?: Partial<SiteAdminAccessSettings>;
}
