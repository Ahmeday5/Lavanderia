/**
 * Primitive coercion helpers for mapping raw API payloads into typed models.
 *
 * Every model mapper (`toCity`, `toService`, …) is built on these so that a
 * missing, renamed or mistyped field degrades to a safe default instead of
 * leaking `undefined` into a template — the backend contract is enforced at
 * the service boundary, once, rather than trusted in every component.
 */

export type RawRecord = Record<string, unknown>;

/** Returns `value` as a plain object, or `{}` for null/primitives/arrays. */
export function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

export function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}
