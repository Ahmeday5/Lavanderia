/**
 * Whose orders are being listed. The API scopes `dashboard/orders` by an
 * owner (`ownerType` + `ownerId`); the dashboard reaches it from the
 * customers / laundries / drivers lists.
 *
 * URLs use a lowercase slug (`/orders/laundry/1`) and the API the PascalCase
 * enum name — this file is the only place that knows about both.
 */
export const ORDER_OWNER_TYPES = ['Customer', 'Laundry', 'Driver'] as const;

export type OrderOwnerType = (typeof ORDER_OWNER_TYPES)[number];

export interface OrderOwner {
  type: OrderOwnerType;
  id: number;
}

export interface OrderOwnerMeta {
  slug: string;
  /** Singular noun, e.g. "المغسلة". */
  label: string;
  icon: string;
  /** The list page the owner lives on (for breadcrumbs / back links). */
  listRoute: string;
  listLabel: string;
  /** Hero copy under the owner's name. */
  description: string;
}

export const ORDER_OWNER_META: Readonly<Record<OrderOwnerType, OrderOwnerMeta>> = {
  Customer: {
    slug: 'customer',
    label: 'العميل',
    icon: 'fa-user',
    listRoute: '/customers',
    listLabel: 'العملاء',
    description: 'جميع الطلبات التي أنشأها هذا العميل عبر التطبيق',
  },
  Laundry: {
    slug: 'laundry',
    label: 'المغسلة',
    icon: 'fa-store',
    listRoute: '/laundries',
    listLabel: 'المغاسل',
    description: 'جميع الطلبات التي استقبلتها هذه المغسلة',
  },
  Driver: {
    slug: 'driver',
    label: 'السائق',
    icon: 'fa-motorcycle',
    listRoute: '/drivers',
    listLabel: 'السائقون',
    description: 'جميع الطلبات التي شارك هذا السائق في استلامها أو توصيلها',
  },
};

export function ownerTypeFromSlug(slug: string | null | undefined): OrderOwnerType | null {
  const needle = slug?.trim().toLowerCase();
  return ORDER_OWNER_TYPES.find((t) => ORDER_OWNER_META[t].slug === needle) ?? null;
}

/** Parses a positive integer route id, or `null`. */
export function parseOwnerId(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Router link to an owner's orders page — use this instead of hand-building
 * the URL, so the route shape lives in one place.
 *
 *   <a [routerLink]="ownerOrdersLink('Driver', d.id)" [queryParams]="{ name: d.fullName }">
 */
export function ownerOrdersLink(type: OrderOwnerType, id: number): (string | number)[] {
  return ['/orders', ORDER_OWNER_META[type].slug, id];
}
