import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
} from '../../../core/utils/coerce.util';
import { OrderStatus, toOrderStatus } from './order-status.model';

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  /** Sent back to the customer unwashed (e.g. rejected at the laundry). */
  isReturned: boolean;
}

export type OrderTripType = 'Pickup' | 'Dropoff';

/** Where a trip stands, derived from the raw flags (see `tripStateOf`). */
export type OrderTripState = 'unassigned' | 'assigned' | 'awaiting-confirmation' | 'confirmed';

/** One driver leg of an order: customer → laundry (pickup) or back (dropoff). */
export interface OrderTrip {
  id: number;
  type: OrderTripType;
  driverId: number | null;
  driverName: string | null;
  driverPhoneNumber: string | null;
  fee: number;
  isAwaitingConfirmation: boolean;
  isConfirmed: boolean;
  /** Proof-of-delivery photos uploaded by the driver. */
  photoUrls: string[];
  distanceKm: number | null;
  /** Drivers who asked to take this trip, still unanswered. */
  pendingRequestsCount: number;
  state: OrderTripState;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Order {
  id: number;
  laundryId: number;
  laundryName: string;
  customerName: string;
  customerPhoneNumber: string;
  pickupContactName: string;
  pickupContactPhoneNumber: string;
  /** `null` when the backend sent a status this dashboard doesn't know. */
  status: OrderStatus | null;
  deliveryAddress: string;
  /** `null` when the backend has no real coordinates (missing or 0,0). */
  deliveryLocation: GeoPoint | null;
  itemsTotal: number;
  pickupFee: number;
  dropoffFee: number;
  totalPrice: number;
  createdAt: string | null;
  paymentUrl: string | null;
  paymentStatus: string | null;
  items: OrderItem[];
  /** Total pieces across all lines. */
  piecesCount: number;
  pickupTrip: OrderTrip | null;
  dropoffTrip: OrderTrip | null;
  hasPendingAdjustment: boolean;
}

export function toOrder(raw: unknown): Order {
  const r = asRecord(raw);
  const items = asArray(r['items']).map(toOrderItem);

  return {
    id: asNumber(r['id']),
    laundryId: asNumber(r['laundryId']),
    laundryName: asString(r['laundryName']),
    customerName: asString(r['customerName']),
    customerPhoneNumber: asString(r['customerPhoneNumber']),
    pickupContactName: asString(r['pickupContactName']),
    pickupContactPhoneNumber: asString(r['pickupContactPhoneNumber']),
    status: toOrderStatus(r['status']),
    deliveryAddress: asString(r['deliveryAddress']),
    deliveryLocation: toGeoPoint(r['deliveryLatitude'], r['deliveryLongitude']),
    itemsTotal: asNumber(r['itemsTotal']),
    pickupFee: asNumber(r['pickupFee']),
    dropoffFee: asNumber(r['dropoffFee']),
    totalPrice: asNumber(r['totalPrice']),
    createdAt: asNullableString(r['createdAt']),
    paymentUrl: asNullableString(r['paymentUrl']),
    paymentStatus: asNullableString(r['paymentStatus']),
    items,
    piecesCount: items.reduce((sum, item) => sum + item.quantity, 0),
    pickupTrip: toOrderTrip(r['pickupTrip'], 'Pickup'),
    dropoffTrip: toOrderTrip(r['dropoffTrip'], 'Dropoff'),
    hasPendingAdjustment: r['pendingAdjustment'] !== null && r['pendingAdjustment'] !== undefined,
  };
}

function toOrderItem(raw: unknown): OrderItem {
  const r = asRecord(raw);
  return {
    id: asNumber(r['id']),
    name: asString(r['serviceItemName']),
    price: asNumber(r['price']),
    quantity: asNumber(r['quantity']),
    lineTotal: asNumber(r['lineTotal']),
    isReturned: asBoolean(r['isReturned']),
  };
}

function toOrderTrip(raw: unknown, fallbackType: OrderTripType): OrderTrip | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = asRecord(raw);
  const driverId = r['driverId'] === null || r['driverId'] === undefined ? null : asNumber(r['driverId']);
  const isAwaitingConfirmation = asBoolean(r['isAwaitingConfirmation']);
  const isConfirmed = asBoolean(r['isConfirmed']);
  const type = r['type'] === 'Pickup' || r['type'] === 'Dropoff' ? r['type'] : fallbackType;

  return {
    id: asNumber(r['id']),
    type,
    driverId,
    driverName: asNullableString(r['driverName']),
    driverPhoneNumber: asNullableString(r['driverPhoneNumber']),
    fee: asNumber(r['fee']),
    isAwaitingConfirmation,
    isConfirmed,
    photoUrls: asArray(r['photoUrls']).filter((u): u is string => typeof u === 'string' && u !== ''),
    distanceKm: r['distanceKm'] === null || r['distanceKm'] === undefined ? null : asNumber(r['distanceKm']),
    pendingRequestsCount: asNumber(r['pendingRequestsCount']),
    state: tripStateOf(driverId, isAwaitingConfirmation, isConfirmed),
  };
}

function tripStateOf(driverId: number | null, awaiting: boolean, confirmed: boolean): OrderTripState {
  if (confirmed) return 'confirmed';
  if (awaiting) return 'awaiting-confirmation';
  return driverId === null ? 'unassigned' : 'assigned';
}

function toGeoPoint(lat: unknown, lng: unknown): GeoPoint | null {
  const la = asNumber(lat, NaN);
  const ln = asNumber(lng, NaN);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la === 0 && ln === 0) return null; // "null island" = not set
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export const TRIP_TYPE_META: Readonly<Record<OrderTripType, { label: string; icon: string; route: string }>> = {
  Pickup: { label: 'رحلة الاستلام', icon: 'fa-arrow-up-from-bracket', route: 'من العميل إلى المغسلة' },
  Dropoff: { label: 'رحلة التسليم', icon: 'fa-truck-ramp-box', route: 'من المغسلة إلى العميل' },
};

export const TRIP_STATE_META: Readonly<Record<OrderTripState, { label: string; icon: string; tone: 'muted' | 'info' | 'warn' | 'ok' }>> = {
  unassigned: { label: 'لم يُعيَّن سائق', icon: 'fa-user-clock', tone: 'muted' },
  assigned: { label: 'تم تعيين سائق', icon: 'fa-user-check', tone: 'info' },
  'awaiting-confirmation': { label: 'بانتظار التأكيد', icon: 'fa-hourglass-half', tone: 'warn' },
  confirmed: { label: 'تم التأكيد', icon: 'fa-circle-check', tone: 'ok' },
};

/** Google Maps link for a point. */
export function mapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}
