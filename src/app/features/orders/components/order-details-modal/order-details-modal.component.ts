import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { formatDateTime } from '../../../../shared/utils/date-format.util';
import { formatDecimal, formatInteger, formatMoney } from '../../../../shared/utils/number-format.util';
import {
  ORDER_STATUS_META,
  ORDER_TIMELINE,
  timelineIndexOf,
} from '../../models/order-status.model';
import {
  Order,
  OrderTrip,
  TRIP_STATE_META,
  TRIP_TYPE_META,
  mapsUrl,
} from '../../models/order.model';
import { OrderStatusBadgeComponent } from '../order-status-badge/order-status-badge.component';

type StepState = 'done' | 'current' | 'upcoming';

interface TimelineStep {
  label: string;
  icon: string;
  state: StepState;
}

/**
 * Read-only order details: lifecycle tracker, parties, items, price
 * breakdown and both driver trips (with proof-of-delivery photos).
 *
 *   <app-order-details-modal [order]="selected()" (closed)="selected.set(null)" />
 *
 * Open while `order` is non-null.
 */
@Component({
  selector: 'app-order-details-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, PhoneActionsComponent, OrderStatusBadgeComponent],
  templateUrl: './order-details-modal.component.html',
  styleUrl: './order-details-modal.component.scss',
})
export class OrderDetailsModalComponent {
  readonly order = input<Order | null>(null);
  readonly closed = output<void>();

  protected readonly title = computed(() => {
    const order = this.order();
    return order ? `تفاصيل الطلب #${order.id}` : '';
  });

  protected readonly isRejected = computed(() => this.order()?.status === 'Rejected');

  protected readonly timeline = computed<TimelineStep[]>(() => {
    const status = this.order()?.status ?? null;
    const current = status === null || status === 'Rejected' ? -1 : timelineIndexOf(status);
    const delivered = status === 'Delivered';

    return ORDER_TIMELINE.map((step, i) => ({
      label: ORDER_STATUS_META[step].label,
      icon: ORDER_STATUS_META[step].icon,
      state: i < current || (delivered && i === current) ? 'done' : i === current ? 'current' : 'upcoming',
    }));
  });

  /** Filled share of the tracker's connecting line, 0‥1. */
  protected readonly timelineProgress = computed(() => {
    const steps = this.timeline();
    const reached = steps.reduce((last, step, i) => (step.state === 'upcoming' ? last : i), -1);
    return steps.length > 1 && reached > 0 ? reached / (steps.length - 1) : 0;
  });

  protected readonly trips = computed<{ type: 'Pickup' | 'Dropoff'; trip: OrderTrip | null }[]>(() => {
    const order = this.order();
    return order
      ? [
          { type: 'Pickup', trip: order.pickupTrip },
          { type: 'Dropoff', trip: order.dropoffTrip },
        ]
      : [];
  });

  protected readonly pickupContactDiffers = computed(() => {
    const o = this.order();
    return !!o && (o.pickupContactName !== o.customerName || o.pickupContactPhoneNumber !== o.customerPhoneNumber);
  });

  protected readonly tripType = TRIP_TYPE_META;
  protected readonly tripState = TRIP_STATE_META;
  protected readonly mapsUrl = mapsUrl;
  protected readonly money = formatMoney;
  protected readonly int = formatInteger;
  protected readonly decimal = formatDecimal;
  protected readonly formatDateTime = formatDateTime;
}
