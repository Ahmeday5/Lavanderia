import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { pendingSet } from '../../../../core/utils/pending-set.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { AccountBadgesComponent } from '../../../accounts/components/account-badges/account-badges.component';
import { DeletedToggleComponent } from '../../../accounts/components/deleted-toggle/deleted-toggle.component';
import { ACCOUNT_PAGE_SIZE_OPTIONS } from '../../../accounts/models/account.model';
import { createAccountList } from '../../../accounts/utils/account-list.util';
import { OwnerOrdersLinkComponent } from '../../../orders/components/owner-orders-link/owner-orders-link.component';
import { Customer, customerBadges } from '../../models/customer.model';
import { CustomersService } from '../../services/customers.service';
import { CustomerActionsService } from '../../services/customer-actions.service';

/**
 * Customers — `/customers?search=…`. Server search & pagination; the search
 * lives in the URL. Deleted accounts are view-only; ban & delete are Admin-only.
 */
@Component({
  selector: 'app-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    PaginationComponent,
    PhoneActionsComponent,
    RefreshButtonComponent,
    OwnerOrdersLinkComponent,
    AccountBadgesComponent,
    DeletedToggleComponent,
  ],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent {
  private readonly customersService = inject(CustomersService);
  private readonly actions = inject(CustomerActionsService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly accounts = createAccountList((query) => this.customersService.list(query));
  protected readonly list = this.accounts.list;
  protected readonly includeDeleted = this.accounts.includeDeleted;
  protected readonly pending = pendingSet<number>();

  protected readonly pageSizeOptions = ACCOUNT_PAGE_SIZE_OPTIONS;
  protected readonly badges = customerBadges;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  protected async onToggleBan(customer: Customer): Promise<void> {
    if (this.pending.has(customer.id)) return;
    const changed = await this.actions.toggleBan(customer, (busy) => this.setBusy(customer.id, busy));
    if (!changed) return;
    this.list.updateItems((items) =>
      items.map((c) => (c.id === customer.id ? { ...c, isBanned: !customer.isBanned } : c)),
    );
  }

  protected async onDelete(customer: Customer): Promise<void> {
    if (this.pending.has(customer.id)) return;
    const deleted = await this.actions.delete(customer, (busy) => this.setBusy(customer.id, busy));
    if (deleted) this.list.reload();
  }

  private setBusy(id: number, busy: boolean): void {
    if (busy) this.pending.add(id);
    else this.pending.delete(id);
  }
}
