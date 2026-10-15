import {
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asString,
} from '../../../core/utils/coerce.util';
import { City, toCity } from '../../cities/models/city.model';
import { Customer, toCustomer } from '../../customers/models/customer.model';
import { Driver, toDriver } from '../../drivers/models/driver.model';
import { Laundry, toLaundry } from '../../laundries/models/laundry.model';
import { OrderStatus, toOrderStatus } from '../../orders/models/order-status.model';

/** Default and maximum `limit` of `GET dashboard/search` (results per group). */
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 20;

/** One result group: `count` is the TOTAL number of matches, `items` the first `limit`. */
export interface SearchGroup<T> {
  count: number;
  items: T[];
}

export interface SearchOrderHit {
  id: number;
  status: OrderStatus | null;
  customerId: number;
  customerName: string;
  customerPhoneNumber: string;
  laundryId: number;
  laundryName: string;
  totalPrice: number;
  createdAt: string | null;
}

export interface SearchServiceHit {
  id: number;
  name: string;
  imageUrl: string | null;
}

export interface SearchServiceItemHit extends SearchServiceHit {
  serviceId: number;
  serviceName: string;
  /** Set when the hit is a type ("نوع") of a parent item. */
  parentItemId: number | null;
  parentItemName: string | null;
}

/** `DashboardSearchResultDto`. */
export interface GlobalSearchResult {
  totalCount: number;
  laundries: SearchGroup<Laundry>;
  customers: SearchGroup<Customer>;
  drivers: SearchGroup<Driver>;
  orders: SearchGroup<SearchOrderHit>;
  cities: SearchGroup<City>;
  services: SearchGroup<SearchServiceHit>;
  serviceItems: SearchGroup<SearchServiceItemHit>;
}

export function toGlobalSearchResult(raw: unknown): GlobalSearchResult {
  const r = asRecord(raw);
  const result: Omit<GlobalSearchResult, 'totalCount'> = {
    laundries: toGroup(r['laundries'], toLaundry),
    customers: toGroup(r['customers'], toCustomer),
    drivers: toGroup(r['drivers'], toDriver),
    orders: toGroup(r['orders'], toOrderHit),
    cities: toGroup(r['cities'], toCity),
    services: toGroup(r['services'], toServiceHit),
    serviceItems: toGroup(r['serviceItems'], toServiceItemHit),
  };
  const summed = Object.values(result).reduce((sum, group) => sum + group.count, 0);
  return { totalCount: asNumber(r['totalCount'], summed), ...result };
}

function toGroup<T>(raw: unknown, mapItem: (item: unknown) => T): SearchGroup<T> {
  const r = asRecord(raw);
  const items = Array.isArray(r['items']) ? r['items'].map(mapItem) : [];
  return { count: Math.max(asNumber(r['count'], items.length), items.length), items };
}

function toOrderHit(raw: unknown): SearchOrderHit {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    status: toOrderStatus(r['status']),
    customerId: asNumber(r['customerId']),
    customerName: asString(r['customerName']),
    customerPhoneNumber: asString(r['customerPhoneNumber']),
    laundryId: asNumber(r['laundryId']),
    laundryName: asString(r['laundryName']),
    totalPrice: asNumber(r['totalPrice']),
    createdAt: asNullableString(r['createdAt']),
  };
}

function toServiceHit(raw: unknown): SearchServiceHit {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['name']),
    imageUrl: asNullableString(r['imageUrl']),
  };
}

function toServiceItemHit(raw: unknown): SearchServiceItemHit {
  const r = asRecord(raw);
  return {
    ...toServiceHit(raw),
    serviceId: asNumber(r['serviceId']),
    serviceName: asString(r['serviceName']),
    parentItemId: asNullableNumber(r['parentItemId']),
    parentItemName: asNullableString(r['parentItemName']),
  };
}
