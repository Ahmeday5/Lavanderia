import { asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A laundry service category (e.g. "غسيل الملابس"). Items are fetched separately per service. */
export interface Service {
  id: number;
  name: string;
  /** Uploaded separately via `POST /services/:id/image`. */
  imageUrl: string | null;
}

export interface CreateServiceRequest {
  name: string;
}

export interface UpdateServiceRequest {
  name: string;
}

/** Response of the image upload endpoints (services and service items). */
export interface ImageUploadResult {
  imageUrl: string | null;
}

/** Maps a raw API row into a well-formed `Service`. */
export function toService(raw: unknown): Service {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['name']),
    imageUrl: asNullableString(r['imageUrl']),
  };
}

export function toImageUploadResult(raw: unknown): ImageUploadResult {
  return { imageUrl: asNullableString(asRecord(raw)['imageUrl']) };
}
