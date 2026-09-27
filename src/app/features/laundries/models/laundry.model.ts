import { asBoolean, asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A laundry business account registered on the platform. */
export interface Laundry {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  createdAt: string | null;
}

/** Maps a raw API row into a well-formed `Laundry`. */
export function toLaundry(raw: unknown): Laundry {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['name']),
    phoneNumber: asString(r['phoneNumber']),
    cityName: asNullableString(r['cityName']),
    phoneNumberConfirmed: asBoolean(r['phoneNumberConfirmed']),
    isBanned: asBoolean(r['isBanned']),
    createdAt: asNullableString(r['createdAt']),
  };
}
