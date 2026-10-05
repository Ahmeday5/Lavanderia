import { asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/**
 * Audience an advertisement is shown to — the single source of truth for the
 * backend enum values and their Arabic copy/visuals. Filters, badges and the
 * form all read from here, so a new audience is one entry, not a template hunt.
 *
 * Order matters: it is the order audiences are listed in the UI.
 */
export const AD_TARGET_TYPES = ['Customer', 'Laundry', 'Driver'] as const;

export type AdTargetType = (typeof AD_TARGET_TYPES)[number];

export interface AdTargetMeta {
  label: string;
  /** Plural form for filters and counters ("إعلانات العملاء"). */
  audience: string;
  /** One-line explanation, shown as helper text in the form. */
  hint: string;
  icon: string;
  /** Mark color (dots, borders). */
  color: string;
  /** Darker ink for text on the tinted background (AA contrast). */
  ink: string;
  /** Tinted chip / badge background. */
  tint: string;
}

export const AD_TARGET_META: Readonly<Record<AdTargetType, AdTargetMeta>> = {
  Customer: {
    label: 'العملاء',
    audience: 'تطبيق العملاء',
    hint: 'يظهر لمستخدمي تطبيق العملاء',
    icon: 'fa-user',
    color: '#2a78d6',
    ink: '#1c5cab',
    tint: 'rgba(42, 120, 214, 0.12)',
  },
  Laundry: {
    label: 'المغاسل',
    audience: 'تطبيق المغاسل',
    hint: 'يظهر لأصحاب المغاسل الشريكة',
    icon: 'fa-store',
    color: '#1baf7a',
    ink: '#0b7a53',
    tint: 'rgba(27, 175, 122, 0.13)',
  },
  Driver: {
    label: 'السائقون',
    audience: 'تطبيق السائقين',
    hint: 'يظهر للسائقين في تطبيق التوصيل',
    icon: 'fa-truck',
    color: '#eda100',
    ink: '#8a5a00',
    tint: 'rgba(237, 161, 0, 0.14)',
  },
};

export function isAdTargetType(value: unknown): value is AdTargetType {
  return typeof value === 'string' && (AD_TARGET_TYPES as readonly string[]).includes(value);
}

export interface Advertisement {
  id: number;
  title: string;
  imageUrl: string | null;
  /** `null` when the backend sends an audience this dashboard doesn't know yet. */
  targetType: AdTargetType | null;
}

export interface AdvertisementListFilter {
  /** `null` lists every audience. */
  targetType: AdTargetType | null;
}

export interface CreateAdvertisementRequest {
  title: string;
  targetType: AdTargetType;
  /** Required on create — an ad without an image has nothing to show. */
  image: File;
}

export interface UpdateAdvertisementRequest {
  title: string;
  targetType: AdTargetType;
  /** Omit to keep the current image. */
  image?: File | null;
}

/** Maps a raw API row into a well-formed `Advertisement`. */
export function toAdvertisement(raw: unknown): Advertisement {
  const r = asRecord(raw);
  const targetType = r['targetType'];
  return {
    id: asNumber(r['id']),
    title: asString(r['title']),
    imageUrl: asNullableString(r['imageUrl']),
    targetType: isAdTargetType(targetType) ? targetType : null,
  };
}
