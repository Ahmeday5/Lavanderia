/**
 * Parses backend timestamps defensively. .NET often emits 7 fractional-second
 * digits and no zone (`2026-09-27T08:27:40.3962162`), which some engines
 * (notably Safari) refuse to parse, so fractions are trimmed to milliseconds.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_FMT = new Intl.DateTimeFormat('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' });
const DATE_TIME_FMT = new Intl.DateTimeFormat('ar-LY', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "27 سبتمبر 2026" style date, or `—` for missing/invalid input. */
export function formatDate(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? DATE_FMT.format(date) : '—';
}

/** Full date + time, for tooltips. */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? DATE_TIME_FMT.format(date) : '';
}
