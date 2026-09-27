import { toLatinDigits } from './local-search.util';

/**
 * Country code applied to local numbers that match no known national pattern.
 * Libya — the platform's market (ar-LY formatting, Libyan cities).
 */
export const DEFAULT_COUNTRY_CODE = '218';

/**
 * National mobile formats → international. First match wins. Extend this list
 * when onboarding a new country.
 */
const NATIONAL_RULES: readonly { pattern: RegExp; countryCode: string }[] = [
  // Libya: 091–095 + 7 digits
  { pattern: /^09[1-5]\d{7}$/, countryCode: '218' },
  // Egypt: 010/011/012/015 + 8 digits
  { pattern: /^01[0125]\d{8}$/, countryCode: '20' },
];

/** Digits only (and Arabic-Indic digits converted), keeping a leading `+`. */
export function cleanPhone(raw: string | null | undefined): string {
  const latin = toLatinDigits(raw ?? '').trim();
  const plus = latin.startsWith('+');
  const digits = latin.replace(/\D/g, '');
  return plus ? `+${digits}` : digits;
}

/**
 * International form as bare digits (`218912345678`) — the format wa.me
 * expects. Returns `null` when the number can't be resolved confidently.
 */
export function toInternationalDigits(raw: string | null | undefined): string | null {
  let value = cleanPhone(raw);
  if (!value) return null;

  if (value.startsWith('+')) value = value.slice(1);
  else if (value.startsWith('00')) value = value.slice(2);
  else {
    const rule = NATIONAL_RULES.find((r) => r.pattern.test(value));
    if (rule) value = rule.countryCode + value.slice(1);
    else if (value.startsWith('0')) value = DEFAULT_COUNTRY_CODE + value.slice(1);
  }

  // E.164: at most 15 digits; below 10 is too short to be a full mobile number.
  return value.length >= 10 && value.length <= 15 ? value : null;
}

export function telHref(raw: string | null | undefined): string | null {
  const value = cleanPhone(raw);
  return value ? `tel:${value}` : null;
}

export function whatsAppHref(raw: string | null | undefined, message?: string): string | null {
  const intl = toInternationalDigits(raw);
  if (!intl) return null;
  return `https://wa.me/${intl}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Clipboard write with a fallback for non-secure contexts / older browsers. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;inset-inline-start:-9999px;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
