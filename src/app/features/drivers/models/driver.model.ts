import { asBoolean, asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A delivery driver registered through the driver app. */
export interface Driver {
  id: number;
  fullName: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  /** Admin-controlled: an inactive driver can't receive orders. */
  isActive: boolean;
  /** Driver-controlled: currently online / accepting orders. */
  isAvailable: boolean;
  createdAt: string | null;
}

/** Maps a raw API row into a well-formed `Driver`. */
export function toDriver(raw: unknown): Driver {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    fullName: asString(r['fullName']),
    phoneNumber: asString(r['phoneNumber']),
    cityName: asNullableString(r['cityName']),
    phoneNumberConfirmed: asBoolean(r['phoneNumberConfirmed']),
    isActive: asBoolean(r['isActive']),
    isAvailable: asBoolean(r['isAvailable']),
    createdAt: asNullableString(r['createdAt']),
  };
}
