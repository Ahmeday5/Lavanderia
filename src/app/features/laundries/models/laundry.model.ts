import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asString,
} from '../../../core/utils/coerce.util';
import { AccountBadge, DELETED_BADGE } from '../../accounts/models/account.model';

/** A laundry business account — a row of `GET dashboard/laundries` (`LaundryAccountDto`). */
export interface Laundry {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  isDeleted: boolean;
  createdAt: string | null;
}

/** `GET dashboard/laundries/:id` (`LaundryAccountDetailsDto`). */
export interface LaundryDetails extends Laundry {
  ownerName: string;
  ownerPhoneNumber: string;
  address: string;
  cityId: number;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  baseDeliveryFee: number;
  deliveryPricePerKm: number;
  walletBalance: number;
  deletedAt: string | null;
}

/**
 * Body of `POST` / `PUT dashboard/laundries` (sent as multipart, because of
 * the image). `password` and `image` are omitted when absent, which on an edit
 * leaves the current ones untouched.
 */
export interface SaveLaundryRequest {
  name: string;
  ownerName: string;
  ownerPhoneNumber: string;
  /** Libyan mobile — the account's login. */
  phoneNumber: string;
  password: string | null;
  address: string;
  cityId: number;
  latitude: number | null;
  longitude: number | null;
  baseDeliveryFee: number;
  deliveryPricePerKm: number;
  image: File | null;
}

/** Router `state` key a form uses to hand the saved record to the details page. */
export const LAUNDRY_STATE_KEY = 'laundry';

export function toLaundry(raw: unknown): Laundry {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['name']),
    phoneNumber: asString(r['phoneNumber']),
    cityName: asNullableString(r['cityName']),
    phoneNumberConfirmed: asBoolean(r['phoneNumberConfirmed']),
    isBanned: asBoolean(r['isBanned']),
    isDeleted: asBoolean(r['isDeleted']),
    createdAt: asNullableString(r['createdAt']),
  };
}

export function toLaundryDetails(raw: unknown): LaundryDetails {
  const r = asRecord(raw);
  return {
    ...toLaundry(raw),
    ownerName: asString(r['ownerName']),
    ownerPhoneNumber: asString(r['ownerPhoneNumber']),
    address: asString(r['address']),
    cityId: asNumber(r['cityId']),
    latitude: asNullableNumber(r['latitude']),
    longitude: asNullableNumber(r['longitude']),
    imageUrl: asNullableString(r['imageUrl']),
    baseDeliveryFee: asNumber(r['baseDeliveryFee']),
    deliveryPricePerKm: asNumber(r['deliveryPricePerKm']),
    walletBalance: asNumber(r['walletBalance']),
    deletedAt: asNullableString(r['deletedAt']),
  };
}

export function laundryBadges(laundry: Pick<Laundry, 'isBanned' | 'isDeleted'>): AccountBadge[] {
  if (laundry.isDeleted) return [DELETED_BADGE];
  return laundry.isBanned
    ? [{ label: 'محظورة', tone: 'bad', icon: 'fa-ban' }]
    : [{ label: 'نشطة', tone: 'ok', icon: 'fa-circle-check' }];
}
