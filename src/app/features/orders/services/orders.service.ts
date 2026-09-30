import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import { toOrder } from '../models/order.model';
import { OrderOwner } from '../models/order-owner.model';
import { OrderStatus } from '../models/order-status.model';

const ENDPOINT = 'dashboard/orders';

export interface OrdersFilter {
  owner: OrderOwner;
  /** Omit for every status. */
  status?: OrderStatus | null;
}

/**
 * Orders, always scoped to one owner (customer, laundry or driver) and
 * optionally narrowed to one status. Server-paginated; short cache TTL since
 * orders advance from the mobile apps (see `cache-policy.ts`).
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiService);

  list(filter: OrdersFilter, query: PagedQuery = {}) {
    const params = {
      ownerType: filter.owner.type,
      ownerId: filter.owner.id,
      status: filter.status ?? undefined,
      ...toPagedParams(query),
    };
    return this.api.get<unknown>(ENDPOINT, { params }).pipe(toPaged(toOrder));
  }
}
