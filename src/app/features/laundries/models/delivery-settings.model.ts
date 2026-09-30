import { asNumber, asRecord } from '../../../core/utils/coerce.util';

/** Platform-wide delivery pricing settings. */
export interface DeliverySettings {
  /** Flat fee (LYD) charged instead of the distance-based fee for short trips. */
  minimumDeliveryFee: number;
}

export type UpdateDeliverySettingsRequest = DeliverySettings;

/**
 * Distance (km) below which the backend charges `minimumDeliveryFee`.
 * The rule is enforced server-side; this mirrors it for display only.
 */
export const MINIMUM_FEE_DISTANCE_KM = 1;

/** Accepted range for the minimum fee — the upper bound guards against typos. */
export const MINIMUM_DELIVERY_FEE_LIMITS = { min: 0, max: 1000 } as const;

export function toDeliverySettings(raw: unknown): DeliverySettings {
  const r = asRecord(raw);
  return {
    minimumDeliveryFee: asNumber(r['minimumDeliveryFee']),
  };
}
