import type { SiteSmsSettings, SmsProviderId } from '@kia./shared';

export interface SmsOtpSendInput {
  /** Normalized Iranian phone `09xxxxxxxxx`. */
  phone: string;
  /** 6-digit OTP code (no spaces). */
  code: string;
}

export interface SmsOtpSendResult {
  /** Provider message / tracking id when available. */
  messageId?: string | null;
  /** True when the provider only logged locally (dev). */
  simulated?: boolean;
}

/**
 * Pluggable Persian SMS/OTP provider. New vendors (Melipayamak, Ghasedak, …)
 * implement this interface and register in SmsProviderRegistry.
 */
export interface SmsProvider {
  readonly id: SmsProviderId;
  sendOtp(input: SmsOtpSendInput, settings: SiteSmsSettings): Promise<SmsOtpSendResult>;
}
