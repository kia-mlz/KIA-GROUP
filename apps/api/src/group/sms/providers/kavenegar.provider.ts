import {
  BadGatewayException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SiteSmsSettings } from '@kia./shared';
import type { SmsOtpSendInput, SmsOtpSendResult, SmsProvider } from './sms-provider';

interface KavenegarLookupResponse {
  return?: {
    status?: number;
    message?: string;
  };
  entries?:
    | {
        messageid?: number;
        message?: string;
        status?: number;
        statustext?: string;
        sender?: string;
        receptor?: string;
      }
    | Array<{
        messageid?: number;
        message?: string;
        status?: number;
        statustext?: string;
      }>;
}

const KAVENEGAR_TIMEOUT_MS = 12_000;

/**
 * Kavenegar verify/lookup OTP sender.
 * Docs: https://kavenegar.com/rest.html#Verify-Lookup
 * POST https://api.kavenegar.com/v1/{API-KEY}/verify/lookup.json
 * Required: receptor, token, template (template must be approved in panel).
 */
export class KavenegarSmsProvider implements SmsProvider {
  readonly id = 'kavenegar' as const;
  private readonly logger = new Logger(KavenegarSmsProvider.name);

  async sendOtp(input: SmsOtpSendInput, settings: SiteSmsSettings): Promise<SmsOtpSendResult> {
    const apiKey = settings.apiKey?.trim();
    const template = settings.template?.trim();
    if (!apiKey) {
      throw new BadRequestException('Kavenegar API key is not configured');
    }
    if (!template) {
      throw new BadRequestException(
        'Kavenegar verify template is not configured (create and approve it in the Kavenegar panel)',
      );
    }
    if (!/^\d{6}$/.test(input.code)) {
      throw new BadRequestException('Invalid OTP token for SMS delivery');
    }

    const url = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`;
    const body = new URLSearchParams({
      receptor: input.phone,
      token: input.code,
      template,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(KAVENEGAR_TIMEOUT_MS),
      });
    } catch {
      const masked =
        input.phone.length >= 4
          ? `${input.phone.slice(0, 4)}****${input.phone.slice(-2)}`
          : '****';
      this.logger.error(`[kavenegar] network error sending OTP to ${masked}`);
      throw new ServiceUnavailableException(
        'SMS provider unreachable. Please try again shortly.',
      );
    }

    let payload: KavenegarLookupResponse;
    try {
      payload = (await response.json()) as KavenegarLookupResponse;
    } catch {
      this.logger.error(`[kavenegar] non-JSON response status=${response.status}`);
      throw new BadGatewayException('SMS provider returned an invalid response');
    }

    const status = payload.return?.status;
    if (!response.ok || status !== 200) {
      // Never log apiKey, token, or full response message that may echo the OTP.
      this.logger.warn(
        `[kavenegar] send failed http=${response.status} providerStatus=${status ?? 'n/a'}`,
      );
      throw new BadGatewayException(
        mapKavenegarError(status, payload.return?.message) ??
          'Failed to send verification SMS',
      );
    }

    const entry = Array.isArray(payload.entries) ? payload.entries[0] : payload.entries;
    return {
      messageId: entry?.messageid != null ? String(entry.messageid) : null,
      simulated: false,
    };
  }
}

function mapKavenegarError(status: number | undefined, message?: string): string | null {
  // Common Kavenegar return codes (subset). Prefer generic user-facing copy.
  switch (status) {
    case 411:
      return 'SMS receptor (phone) is invalid';
    case 412:
      return 'SMS sender line is invalid';
    case 413:
      return 'SMS message content is empty or invalid';
    case 414:
      return 'SMS receptor is empty';
    case 417:
      return 'Insufficient SMS account credit';
    case 418:
      return 'SMS account is disabled or restricted';
    case 422:
      return 'OTP tokens cannot contain spaces';
    case 424:
      return 'SMS template is not defined or not approved';
    case 426:
      return 'SMS usage pattern is restricted for this account';
    case 428:
      return 'SMS IP is not allowed for this API key';
    case 431:
      return 'SMS account lacks access to this method';
    case 432:
      return 'SMS account is suspended';
    default:
      if (message && !/\d{4,}/.test(message)) {
        return `SMS provider error: ${message}`;
      }
      return null;
  }
}
