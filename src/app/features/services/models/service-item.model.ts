import { asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A single item within a service (e.g. "قميص" under "غسيل الملابس"). */
export interface ServiceItem {
  id: number;
  serviceId: number;
  name: string;
  imageUrl: string | null;
}

export interface CreateServiceItemRequest {
  serviceId: number;
  name: string;
}

export interface UpdateServiceItemRequest {
  serviceId: number;
  name: string;
}

/**
 * Maps a raw API row into a well-formed `ServiceItem`. The per-service items
 * endpoint omits `serviceId`, so callers that know the parent pass it in.
 */
export function toServiceItem(raw: unknown, parentServiceId = 0): ServiceItem {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    serviceId: asNumber(r['serviceId'], parentServiceId),
    name: asString(r['name']),
    imageUrl: asNullableString(r['imageUrl']),
  };
}
