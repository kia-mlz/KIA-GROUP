/**
 * Types shared by the admin department services.
 *
 * Kept outside `admin.service.ts` so the extracted services (users, academy,
 * events, support, commerce, discounts, stats) can depend on it without a
 * circular import back into the facade that owns them.
 */

/** Per-request metadata captured by the controller for audit logging. */
export interface AdminRequestMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}
