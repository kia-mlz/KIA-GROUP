import { escapeHtml } from '@kia./shared';

export function toFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return Math.min(max, Math.max(min, toFiniteNumber(value, fallback)));
}

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(String(value)).replaceAll('`', '&#96;');
}

export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function uniqueFiltered<T>(
  values: unknown,
  predicate: (value: T) => boolean,
): T[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((v): v is T => predicate(v as T)))];
}

export { escapeHtml };
