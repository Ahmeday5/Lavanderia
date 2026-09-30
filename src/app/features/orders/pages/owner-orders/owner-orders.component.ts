import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { PagedResponse } from '../../../../core/models/api-response.model';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { CountUpDirective } from '../../../../shared/directives/count-up.directive';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { formatInteger, formatMoney } from '../../../../shared/utils/number-format.util';
import { OrderDetailsModalComponent } from '../../components/order-details-modal/order-details-modal.component';
import { OrderStatusBadgeComponent } from '../../components/order-status-badge/order-status-badge.component';
import { OrderStatusFilterComponent } from '../../components/order-status-filter/order-status-filter.component';
import {
  Order,
  OrderTrip,
  OrderTripType,
  TRIP_STATE_META,
  TRIP_TYPE_META,
} from '../../models/order.model';
import {
  ORDER_OWNER_META,
  OrderOwner,
  ownerTypeFromSlug,
  parseOwnerId,
} from '../../models/order-owner.model';
import { ORDER_STATUS_META, OrderStatus, isOrderStatus } from '../../models/order-status.model';
import { OrdersService } from '../../services/orders.service';

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6];
const EMPTY_PAGE: PagedResponse<Order> = { pageIndex: 1, pageSize: 0, count: 0, totalPages: 0, data: [] };

/**
 * Orders of one owner — `/orders/:ownerType/:ownerId?status=…&name=…`.
 *
 * The URL is the single source of truth for *what* is listed: owner from the
 * path, status filter from the query string (so filtered views survive a
 * reload and can be shared). `name` is display-only, passed by the list page
 * that linked here, with a `#id` fallback when someone opens the URL cold.
 */
@Component({
  selector: 'app-owner-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PaginationComponent,
    PhoneActionsComponent,
    RefreshButtonComponent,
    CountUpDirective,
    OrderStatusBadgeComponent,
    OrderStatusFilterComponent,
    OrderDetailsModalComponent,
  ],
  templateUrl: './owner-orders.component.html',
  styleUrl: './owner-orders.component.scss',
})
export class OwnerOrdersComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ── Router-bound inputs (`withComponentInputBinding`) ──
  readonly ownerType = input.required<string>();
  readonly ownerId = input.required<string>();
  readonly status = input<string | undefined>();
  readonly name = input<string | undefined>();

  /** Validated by `orderOwnerGuard`; `null` only if the guard is bypassed. */
  protected readonly owner = computed<OrderOwner | null>(() => {
    const type = ownerTypeFromSlug(this.ownerType());
    const id = parseOwnerId(this.ownerId());
    return type && id ? { type, id } : null;
  });

  protected readonly ownerMeta = computed(() => {
    const owner = this.owner();
    return owner ? ORDER_OWNER_META[owner.type] : null;
  });

  protected readonly ownerName = computed(() => {
    const name = this.name()?.trim();
    if (name) return name;
    const owner = this.owner();
    return owner ? `${ORDER_OWNER_META[owner.type].label} #${owner.id}` : '';
  });

  /** An unknown `?status=` is ignored rather than sent to the API. */
  protected readonly statusFilter = computed<OrderStatus | null>(() => {
    const status = this.status();
    return isOrderStatus(status) ? status : null;
  });

  protected readonly list = createPagedList(
    (query) => {
      const owner = this.owner();
      if (!owner) return of(EMPTY_PAGE);
      return this.ordersService.list({ owner, status: this.statusFilter() }, query);
    },
    { immediate: false },
  );

  /** Context-aware columns: the owner's own column would repeat on every row. */
  protected readonly showCustomer = computed(() => this.owner()?.type !== 'Customer');
  protected readonly showLaundry = computed(() => this.owner()?.type !== 'Laundry');

  protected readonly selectedOrder = signal<Order | null>(null);

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly statusMeta = ORDER_STATUS_META;
  protected readonly tripType = TRIP_TYPE_META;
  protected readonly tripTypes: readonly OrderTripType[] = ['Pickup', 'Dropoff'];
  protected readonly tripState = TRIP_STATE_META;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly money = formatMoney;
  protected readonly int = formatInteger;

  constructor() {
    // (Re)load from page 1 whenever the owner or status filter changes —
    // including the first run, once router inputs are bound.
    effect(() => {
      this.owner();
      this.statusFilter();
      untracked(() => {
        this.selectedOrder.set(null);
        this.list.restart();
      });
    });
  }

  protected setStatus(status: OrderStatus | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected openOrder(order: Order): void {
    this.selectedOrder.set(order);
  }

  protected tripTone(order: Order, type: OrderTripType): string {
    const trip = tripOf(order, type);
    return trip ? TRIP_STATE_META[trip.state].tone : 'none';
  }

  protected tripTitle(order: Order, type: OrderTripType): string {
    const trip = tripOf(order, type);
    const label = TRIP_TYPE_META[type].label;
    if (!trip) return `${label}: لم تُنشأ بعد`;
    const driver = trip.driverName ? ` — ${trip.driverName}` : '';
    return `${label}: ${TRIP_STATE_META[trip.state].label}${driver}`;
  }
}

function tripOf(order: Order, type: OrderTripType): OrderTrip | null {
  return type === 'Pickup' ? order.pickupTrip : order.dropoffTrip;
}
