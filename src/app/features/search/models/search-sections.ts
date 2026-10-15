import { Params } from '@angular/router';
import { SEARCH_QUERY_PARAM } from '../../../core/utils/url-search-sync.util';
import { formatMoney } from '../../../shared/utils/number-format.util';
import { AccountBadge } from '../../accounts/models/account.model';
import { customerBadges } from '../../customers/models/customer.model';
import { driverBadges } from '../../drivers/models/driver.model';
import { laundryBadges } from '../../laundries/models/laundry.model';
import { ORDER_STATUS_META } from '../../orders/models/order-status.model';
import { GlobalSearchResult } from './global-search.model';

/** Query param the services page reads to expand one service (see `ServicesListComponent`). */
export const SERVICES_OPEN_PARAM = 'open';

export interface SearchLink {
  commands: (string | number)[];
  queryParams?: Params;
}

/** One selectable row of the palette. */
export interface SearchEntry {
  /** Unique across sections — also the DOM id suffix for `aria-activedescendant`. */
  key: string;
  primary: string;
  secondary: string;
  icon: string;
  imageUrl: string | null;
  badges: readonly AccountBadge[];
  link: SearchLink;
}

export interface SearchSection {
  key: keyof Omit<GlobalSearchResult, 'totalCount'>;
  label: string;
  icon: string;
  /** Total matches, which may exceed `entries.length`. */
  count: number;
  entries: SearchEntry[];
  /** Full list pre-filtered by the query — only when more matches exist than shown. */
  viewAll: SearchLink | null;
}

/**
 * Turns a search response into the palette's ordered, display-ready sections:
 * laundries → customers → drivers → orders → cities → services → items,
 * empty groups dropped. Pure — the palette only renders and navigates.
 */
export function toSearchSections(result: GlobalSearchResult, query: string): SearchSection[] {
  const q = query.trim();
  const viewAll = (count: number, shown: number, route: string): SearchLink | null =>
    count > shown ? { commands: [route], queryParams: { [SEARCH_QUERY_PARAM]: q } } : null;

  const sections: SearchSection[] = [
    {
      key: 'laundries',
      label: 'المغاسل',
      icon: 'fa-store',
      count: result.laundries.count,
      viewAll: viewAll(result.laundries.count, result.laundries.items.length, '/laundries'),
      entries: result.laundries.items.map((l) => ({
        key: `laundry-${l.id}`,
        primary: l.name || `#${l.id}`,
        secondary: joinParts(l.phoneNumber, l.cityName),
        icon: 'fa-store',
        imageUrl: null,
        badges: laundryBadges(l).filter((b) => b.tone !== 'ok'),
        link: { commands: ['/laundries', l.id] },
      })),
    },
    {
      key: 'customers',
      label: 'العملاء',
      icon: 'fa-user',
      count: result.customers.count,
      viewAll: viewAll(result.customers.count, result.customers.items.length, '/customers'),
      entries: result.customers.items.map((c) => ({
        key: `customer-${c.id}`,
        primary: c.name || `#${c.id}`,
        secondary: joinParts(c.phoneNumber, c.cityName),
        icon: 'fa-user',
        imageUrl: null,
        badges: customerBadges(c).filter((b) => b.tone !== 'ok'),
        link: { commands: ['/customers', c.id] },
      })),
    },
    {
      key: 'drivers',
      label: 'السائقون',
      icon: 'fa-motorcycle',
      count: result.drivers.count,
      viewAll: viewAll(result.drivers.count, result.drivers.items.length, '/drivers'),
      entries: result.drivers.items.map((d) => ({
        key: `driver-${d.id}`,
        primary: d.fullName || `#${d.id}`,
        secondary: joinParts(d.phoneNumber, d.cityName),
        icon: 'fa-motorcycle',
        imageUrl: null,
        badges: driverBadges(d).slice(0, 1),
        link: { commands: ['/drivers', d.id] },
      })),
    },
    {
      key: 'orders',
      label: 'الطلبات',
      icon: 'fa-receipt',
      count: result.orders.count,
      // No orders list page to search in.
      viewAll: null,
      entries: result.orders.items.map((o) => ({
        key: `order-${o.id}`,
        primary: joinParts(`#${o.id}`, o.status ? ORDER_STATUS_META[o.status].label : null),
        secondary: joinParts(
          [o.customerName, o.laundryName].filter(Boolean).join(' ← '),
          formatMoney(o.totalPrice),
        ),
        icon: 'fa-receipt',
        imageUrl: null,
        badges: [],
        // There is no order page; the customer's details are the closest context.
        link: o.customerId > 0
          ? { commands: ['/customers', o.customerId] }
          : { commands: ['/laundries', o.laundryId] },
      })),
    },
    {
      key: 'cities',
      label: 'المدن',
      icon: 'fa-map-pin',
      count: result.cities.count,
      viewAll: viewAll(result.cities.count, result.cities.items.length, '/cities'),
      entries: result.cities.items.map((c) => ({
        key: `city-${c.id}`,
        primary: c.name,
        secondary: 'مدينة',
        icon: 'fa-map-pin',
        imageUrl: null,
        badges: [],
        link: { commands: ['/cities'], queryParams: { [SEARCH_QUERY_PARAM]: c.name } },
      })),
    },
    {
      key: 'services',
      label: 'الخدمات',
      icon: 'fa-shirt',
      count: result.services.count,
      viewAll: null,
      entries: result.services.items.map((s) => ({
        key: `service-${s.id}`,
        primary: s.name,
        secondary: 'خدمة',
        icon: 'fa-shirt',
        imageUrl: s.imageUrl,
        badges: [],
        link: servicesLink(s.name, s.id),
      })),
    },
    {
      key: 'serviceItems',
      label: 'الأصناف',
      icon: 'fa-tag',
      count: result.serviceItems.count,
      viewAll: null,
      entries: result.serviceItems.items.map((i) => ({
        key: `item-${i.id}`,
        primary: i.name,
        secondary: joinParts(i.serviceName, i.parentItemName ? `نوع من: ${i.parentItemName}` : null),
        icon: 'fa-tag',
        imageUrl: i.imageUrl,
        badges: [],
        link: servicesLink(i.serviceName, i.serviceId),
      })),
    },
  ];

  return sections.filter((section) => section.count > 0 && section.entries.length > 0);
}

/** The services page, filtered to one service and with its items panel expanded. */
function servicesLink(serviceName: string, serviceId: number): SearchLink {
  return {
    commands: ['/services'],
    queryParams: { [SEARCH_QUERY_PARAM]: serviceName, [SERVICES_OPEN_PARAM]: serviceId },
  };
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter((part) => !!part && part.trim() !== '').join(' · ');
}
