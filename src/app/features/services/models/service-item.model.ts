import { asNullableString, asNumber, asRecord, asString } from '../../../core/utils/coerce.util';

/**
 * An item within a service. Items form a two-level tree under each service:
 *
 *   service ("غسيل الملابس")
 *     └─ root item ("قميص")              parentItemId = null
 *          └─ sub-item / type ("قميص كتان")  parentItemId = <root id>
 *
 * Sub-items are ordinary items (same endpoints) that point at a root item of
 * the same service. The tree is at most two levels deep: a sub-item never has
 * sub-items of its own, and a root item that has sub-items is not priced
 * itself — laundries price its sub-items instead.
 */
export interface ServiceItem {
  id: number;
  serviceId: number;
  /** `null` for a root item; the parent root item's id for a sub-item. */
  parentItemId: number | null;
  name: string;
  imageUrl: string | null;
  /** Always `[]` for a sub-item. */
  subItems: ServiceItem[];
}

/** Body of both `POST service-items` and `PUT service-items/:id`. */
export interface SaveServiceItemRequest {
  serviceId: number;
  /** `null` saves the item as a root item. */
  parentItemId: number | null;
  name: string;
}

export type CreateServiceItemRequest = SaveServiceItemRequest;
export type UpdateServiceItemRequest = SaveServiceItemRequest;

export function isRootItem(item: Pick<ServiceItem, 'parentItemId'>): boolean {
  return item.parentItemId === null;
}

export function hasSubItems(item: Pick<ServiceItem, 'subItems'>): boolean {
  return item.subItems.length > 0;
}

/**
 * Maps a raw API row (and its nested `subItems`) into a well-formed
 * `ServiceItem`. The per-service items endpoint omits `serviceId`, so callers
 * that know the parent service pass it in; sub-items inherit it from their row.
 */
export function toServiceItem(raw: unknown, parentServiceId = 0): ServiceItem {
  const r = asRecord(raw);
  const serviceId = asNumber(r['serviceId'], parentServiceId);
  const parentItemId = asNumber(r['parentItemId'], 0);
  const subItems = Array.isArray(r['subItems']) ? r['subItems'] : [];
  return {
    id: asNumber(r['id']),
    serviceId,
    parentItemId: parentItemId > 0 ? parentItemId : null,
    name: asString(r['name']),
    imageUrl: asNullableString(r['imageUrl']),
    subItems: subItems.map((sub) => toServiceItem(sub, serviceId)),
  };
}
