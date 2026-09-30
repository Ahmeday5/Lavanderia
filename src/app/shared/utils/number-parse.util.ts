import { APP_CURRENCY } from '../../core/constants/currency.constants';
import { toLatinDigits } from '../../core/utils/local-search.util';

/**
 * Canonical form of a typed amount: Latin digits, `.` as the decimal point,
 * no whitespace. Accepts `.`, `,` and the Arabic decimal separator `٫` —
 * whatever the admin's keyboard produces.
 */
export function normalizeAmountInput(raw: string): string {
  return toLatinDigits(raw).replace(/[٫,]/g, '.').replace(/\s+/g, '');
}

/**
 * Parses a user-typed, non-negative money amount (`10`, `٧٫٥`, `2,250`).
 * Returns `null` for anything that isn't a plain number, or that has more
 * decimals than the currency supports — never a silently rounded value.
 */
export function parseAmount(
  raw: string | null | undefined,
  maxFractionDigits: number = APP_CURRENCY.maxFractionDigits,
): number | null {
  if (raw == null) return null;
  const normalized = normalizeAmountInput(raw);
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxFractionDigits}})?$`);
  if (!pattern.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
