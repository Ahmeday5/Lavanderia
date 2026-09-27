import { asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/** A city dashboard admins can manage — used e.g. to scope laundry branches. */
export interface City {
  id: number;
  name: string;
}

export interface CreateCityRequest {
  name: string;
}

export interface UpdateCityRequest {
  name: string;
}

/** Maps a raw API row into a well-formed `City`. */
export function toCity(raw: unknown): City {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['name']),
  };
}
