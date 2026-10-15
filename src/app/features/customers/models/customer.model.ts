import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asString,
} from '../../../core/utils/coerce.util';
import { AccountBadge, DELETED_BADGE } from '../../accounts/models/account.model';

/** A mobile-app customer — a row of `GET dashboard/customers` (`CustomerAccountDto`). */
export interface Customer {
  id: number;
  name: string;
  phoneNumber: string;
  cityName: string | null;
  phoneNumberConfirmed: boolean;
  isBanned: boolean;
  isDeleted: boolean;
  createdAt: string | null;
}

/** `GET dashboard/customers/:id` (`CustomerAccountDetailsDto`). */
export interface CustomerDetails extends Customer {
  address: string;
  cityId: number;
  latitude: number | null;
  longitude: number | null;
  deletedAt: string | null;
}

/**
 * JSON body of `POST` / `PUT dashboard/customers`. `password: null` on an
 * edit keeps the current password.
 */
export interface SaveCustomerRequest {
  name: string;
  /** Libyan mobile — the account's login. */
  phoneNumber: string;
  password: string | null;
  address: string;
  cityId: number;
  latitude: number | null;
  longitude: number | null;
}

/** Router `state` key a form uses to hand the saved record to the details page. */
export const CUSTOMER_STATE_KEY = 'customer';

export function toCustomer(raw: unknown): Customer {
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

export function toCustomerDetails(raw: unknown): CustomerDetails {
  const r = asRecord(raw);
  return {
    ...toCustomer(raw),
    address: asString(r['address']),
    cityId: asNumber(r['cityId']),
    latitude: asNullableNumber(r['latitude']),
    longitude: asNullableNumber(r['longitude']),
    deletedAt: asNullableString(r['deletedAt']),
  };
}

export function customerBadges(customer: Pick<Customer, 'isBanned' | 'isDeleted'>): AccountBadge[] {
  if (customer.isDeleted) return [DELETED_BADGE];
  return customer.isBanned
    ? [{ label: 'محظور', tone: 'bad', icon: 'fa-ban' }]
    : [{ label: 'نشط', tone: 'ok', icon: 'fa-circle-check' }];
}
