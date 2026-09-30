import { APP_CURRENCY } from '../../core/constants/currency.constants';

/**
 * Locale-aware number formatting, shared by every page that shows counts or
 * money. Same `ar-LY` locale as `date-format.util.ts` (Latin digits), and
 * formatters are built once — `Intl` construction is not cheap.
 */
const LOCALE = APP_CURRENCY.locale;

const INTEGER_FMT = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const DECIMAL_FMT = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
// Plain number + our own fixed symbol (see `APP_CURRENCY`) — not Intl's
// `style: 'currency'`, whose symbol varies by browser.
const MONEY_FMT = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: APP_CURRENCY.maxFractionDigits,
});
/** Non-breaking, so the symbol never wraps onto its own line. */
const MONEY_SEPARATOR = String.fromCharCode(0xa0);
const PERCENT_FMT = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

const safe = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** `1.234` — whole numbers (counts). */
export function formatInteger(value: number | null | undefined): string {
  return INTEGER_FMT.format(safe(value));
}

/** `1.234,5` — up to two decimals (distances, quantities). */
export function formatDecimal(value: number | null | undefined): string {
  return DECIMAL_FMT.format(safe(value));
}

/** `82.602,98 د.ل` — the one way to display an amount anywhere in the app. */
export function formatMoney(value: number | null | undefined): string {
  return `${MONEY_FMT.format(safe(value))}${MONEY_SEPARATOR}${APP_CURRENCY.symbol}`;
}

/** `33%` — `ratio` is a 0‥1 fraction. */
export function formatPercent(ratio: number | null | undefined): string {
  return PERCENT_FMT.format(safe(ratio));
}

/** `part / whole`, guarded against empty wholes (0 instead of NaN). */
export function ratioOf(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
}
