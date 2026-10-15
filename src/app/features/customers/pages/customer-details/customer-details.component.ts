import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { readNavigationState } from '../../../../core/utils/navigation-state.util';
import { createRecordLoader, parseRouteId } from '../../../../core/utils/record-loader.util';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { mapsUrl, toGeoPoint } from '../../../../shared/utils/geo.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { ownerOrdersLink } from '../../../orders/models/order-owner.model';
import { CUSTOMER_STATE_KEY, CustomerDetails, customerBadges } from '../../models/customer.model';
import { CustomersService } from '../../services/customers.service';
import { CustomerActionsService } from '../../services/customer-actions.service';

/** `/customers/:id` — one customer's account, plus its admin actions. */
@Component({
  selector: 'app-customer-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AccountPageHeaderComponent, PhoneActionsComponent],
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.scss',
})
export class CustomerDetailsComponent {
  private readonly customersService = inject(CustomersService);
  private readonly actions = inject(CustomerActionsService);
  private readonly router = inject(Router);

  /** Router-bound `:id`. */
  readonly id = input.required<string>();

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly recordId = computed(() => parseRouteId(this.id()));

  protected readonly record = createRecordLoader<CustomerDetails>({
    id: () => this.recordId(),
    load: (id) => this.customersService.getById(id),
    seed: readNavigationState<CustomerDetails>(CUSTOMER_STATE_KEY),
  });

  protected readonly isBusy = signal(false);
  protected readonly location = computed(() => {
    const customer = this.record.value();
    return customer ? toGeoPoint(customer.latitude, customer.longitude) : null;
  });

  protected readonly badges = customerBadges;
  protected readonly ordersLink = ownerOrdersLink;
  protected readonly mapsUrl = mapsUrl;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected async onToggleBan(customer: CustomerDetails): Promise<void> {
    if (this.isBusy()) return;
    const changed = await this.actions.toggleBan(customer, (busy) => this.isBusy.set(busy));
    if (changed) this.record.set({ ...customer, isBanned: !customer.isBanned });
  }

  protected async onDelete(customer: CustomerDetails): Promise<void> {
    if (this.isBusy()) return;
    const deleted = await this.actions.delete(customer, (busy) => this.isBusy.set(busy));
    if (deleted) void this.router.navigate(['/customers']);
  }
}
