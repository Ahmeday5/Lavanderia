/**
 * The platform's one and only currency: the Libyan dinar. Every amount the
 * dashboard shows goes through `formatMoney` (`shared/utils/number-format.util.ts`),
 * which reads this — never hard-code a currency, symbol or locale elsewhere.
 *
 * The symbol is fixed here rather than taken from the browser's `Intl` data,
 * which differs between engines/OS versions (`د.ل.‏`, `ل.د.`, `LYD`, …) and
 * embeds invisible bidi marks — so the amount looks the same everywhere.
 */
export const APP_CURRENCY = {
  /** ISO 4217 code. */
  code: 'LYD',
  symbol: 'د.ل',
  name: 'دينار ليبي',
  /** Number formatting locale (Latin digits, `.` thousands, `,` decimals). */
  locale: 'ar-LY',
  /** The dinar has 1000 dirhams — keep up to 3 decimals, drop trailing zeros. */
  maxFractionDigits: 3,
} as const;
