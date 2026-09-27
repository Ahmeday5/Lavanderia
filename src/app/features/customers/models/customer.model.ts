import { asBoolean, asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A customer account registered on the mobile app. */
export interface Customer {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  createdAt: string | null;
}

/** Maps a raw API row into a well-formed `Customer`. */
export function toCustomer(raw: unknown): Customer {
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
