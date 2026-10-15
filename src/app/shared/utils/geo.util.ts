import { asNumber } from '../../core/utils/coerce.util';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Coerces a raw latitude/longitude pair into a usable point. `null` when
 * either is missing, out of range, or the "null island" (0,0) placeholder the
 * backend stores for "not set".
 */
export function toGeoPoint(lat: unknown, lng: unknown): GeoPoint | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const la = asNumber(lat, NaN);
  const ln = asNumber(lng, NaN);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la === 0 && ln === 0) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}

/** Google Maps link for a point. */
export function mapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}
