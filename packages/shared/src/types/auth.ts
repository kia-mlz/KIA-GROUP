import type { SiteAdminAccessSettings } from './site-settings';
import type { UserRole } from '@kia./permissions';

// The role model lives in `@kia./permissions` (one home for the
// permission model); re-exported here so every existing consumer keeps
// working unchanged.
export { SYSTEM_ROLES, isStaffRole, isSuperAdmin } from '@kia./permissions';
export type { SystemRole, UserRole } from '@kia./permissions';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  profileComplete: boolean;
  firstName?: string | null;
  lastName?: string | null;
  province?: string | null;
  city?: string | null;
  /** Present for ADMIN (moderator) accounts — individual panel permissions. */
  adminPanelAccess?: SiteAdminAccessSettings;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RequestOtpDto {
  phone: string;
}

export interface RequestOtpResponse {
  phone: string;
  expiresInSeconds: number;
  /** Present only when OTP_DEV_EXPOSE is enabled (local development). */
  devCode?: string;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface CompleteProfileDto {
  firstName: string;
  lastName: string;
  province: string;
  city: string;
  email: string;
  bio?: string;
}

/** Alias used by the learner profile edit page. */
export type UpdateProfileDto = CompleteProfileDto;

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  passwordConfirm: string;
  /** `verify` marks a mailbox-ownership link (AUTH-6 companion). */
  type?: 'reset' | 'verify';
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

/**
 * LOGIN-2FA shape returned by POST /auth/login when the account has TOTP
 * enabled (staff only). Discriminated from AuthResponse by twoFactorRequired;
 * carries NO tokens — the client must complete POST /auth/2fa/verify.
 */
export interface TwoFactorChallengeResponse {
  twoFactorRequired: true;
  challenge: string;
  /** Seconds until the single-purpose challenge expires. */
  expiresIn: number;
}

export interface VerifyTwoFactorDto {
  challenge: string;
  code: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorSetupResponse {
  /** Plain base32 secret — shown exactly once during enrollment. */
  secret: string;
  otpauthUrl: string;
  /** Data URL of the enrollment QR code. */
  qrDataUrl: string;
}

export interface TwoFactorConfirmResponse {
  enabled: true;
  /** One-time display of the 8 single-use recovery codes. */
  recoveryCodes: string[];
}

export interface TwoFactorRecoveryResponse {
  recoveryCodes: string[];
}

export interface TwoFactorStaffRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  twoFactorEnabled: boolean;
}

export interface LearnerState {
  user: AuthUser;
  hasRoadmap: boolean;
  roadmapEnrolled: boolean;
  readinessPaid: boolean;
  testCompleted: boolean;
  profileComplete: boolean;
  entitlements: string[];
  enrollments: string[];
}

/** Normalize Iranian mobile numbers to `09xxxxxxxxx`. Returns null if invalid. */
export function normalizeIranianPhone(input: string): string | null {
  const digits = String(input || '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()]/g, '');

  let normalized = digits;
  if (normalized.startsWith('+98')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('98')) normalized = `0${normalized.slice(2)}`;
  else if (normalized.startsWith('9') && normalized.length === 10) normalized = `0${normalized}`;

  if (!/^09\d{9}$/.test(normalized)) return null;
  return normalized;
}

function isAsciiLetter(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isWordChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    ch === '_'
  );
}

function hasInlineEventHandlerLikePattern(value: string): boolean {
  const lower = value.toLowerCase();
  for (let i = 0; i < lower.length - 3; i += 1) {
    if (lower[i] !== 'o' || lower[i + 1] !== 'n') continue;
    const prev = i > 0 ? lower[i - 1] : '';
    if (prev && isWordChar(prev)) continue;
    let j = i + 2;
    let sawLetter = false;
    while (j < lower.length && isAsciiLetter(lower[j]!)) {
      sawLetter = true;
      j += 1;
    }
    if (!sawLetter) continue;
    while (
      j < lower.length &&
      (lower[j] === ' ' || lower[j] === '\t' || lower[j] === '\n' || lower[j] === '\r')
    ) {
      j += 1;
    }
    if (lower[j] === '=') return true;
  }
  return false;
}

export function containsUnsafeText(value: string): boolean {
  const normalized = String(value || '');
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  const collapsed = lower
    .split(' ')
    .filter(Boolean)
    .join(' ');
  if (lower.includes('<') || lower.includes('>')) return true;
  if (lower.includes('javascript:')) return true;
  if (lower.includes('data:text/html')) return true;
  if (lower.includes('http://') || lower.includes('https://')) return true;
  if (lower.includes('viagra') || lower.includes('casino')) return true;
  if (collapsed.includes('crypto giveaway')) return true;
  if (hasInlineEventHandlerLikePattern(lower)) return true;
  return false;
}

export function isValidEmail(value: string): boolean {
  const input = String(value || '').trim();
  if (!input || input.length > 254) return false;
  if (input.includes(' ')) return false;
  const at = input.indexOf('@');
  if (at <= 0 || at !== input.lastIndexOf('@') || at === input.length - 1) return false;
  const local = input.slice(0, at);
  const domain = input.slice(at + 1);
  if (!local || !domain) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  const dot = domain.lastIndexOf('.');
  if (dot <= 0 || dot === domain.length - 1) return false;
  const tld = domain.slice(dot + 1);
  if (tld.length < 2) return false;
  for (const ch of tld) {
    if (!isAsciiLetter(ch)) return false;
  }
  for (const ch of local) {
    const code = ch.charCodeAt(0);
    const allowedPunct = "._%+-!#$&'*=/^`{|}~";
    const isAlphaNum =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    if (!isAlphaNum && !allowedPunct.includes(ch)) return false;
  }
  for (const ch of domain) {
    const code = ch.charCodeAt(0);
    const isAlphaNum =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    if (!isAlphaNum && ch !== '.' && ch !== '-') return false;
  }
  return true;
}

export function sanitizeProfileText(value: string, maxLength = 80): string {
  return Array.from(String(value || ''))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}
