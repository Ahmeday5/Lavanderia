import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { pendingSet } from '../../../../core/utils/pending-set.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { HasRoleDirective } from '../../../../shared/directives/has-role.directive';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { AccountBadgesComponent } from '../../../accounts/components/account-badges/account-badges.component';
import { DeletedToggleComponent } from '../../../accounts/components/deleted-toggle/deleted-toggle.component';
import { ACCOUNT_PAGE_SIZE_OPTIONS } from '../../../accounts/models/account.model';
import { createAccountList } from '../../../accounts/utils/account-list.util';
import { OwnerOrdersLinkComponent } from '../../../orders/components/owner-orders-link/owner-orders-link.component';
import { Driver, driverBadges } from '../../models/driver.model';
import { DriversService } from '../../services/drivers.service';
import { DriverActionsService } from '../../services/driver-actions.service';

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6];

/**
 * Drivers — `/drivers?search=…`. Server search (name, phone, national id,
 * plate, vehicle…) & pagination; the search lives in the URL. Adding drivers,
 * approval (activate/deactivate) and delete are Admin-only.
 */
@Component({
  selector: 'app-drivers-list',
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
    HasRoleDirective,
  ],
  templateUrl: './drivers-list.component.html',
  styleUrl: './drivers-list.component.scss',
})
export class DriversListComponent {
  private readonly driversService = inject(DriversService);
  private readonly actions = inject(DriverActionsService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly accounts = createAccountList((query) => this.driversService.list(query));
  protected readonly list = this.accounts.list;
  protected readonly includeDeleted = this.accounts.includeDeleted;
  /** ids with an action request in flight. */
  protected readonly pending = pendingSet<number>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly pageSizeOptions = ACCOUNT_PAGE_SIZE_OPTIONS;
  protected readonly badges = driverBadges;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '؟';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected async onToggleActive(driver: Driver): Promise<void> {
    if (this.pending.has(driver.id)) return;
    const changed = await this.actions.toggleActive(driver, (busy) => this.setBusy(driver.id, busy));
    if (!changed) return;
    this.list.updateItems((items) =>
      items.map((d) => (d.id === driver.id ? { ...d, isActive: !driver.isActive } : d)),
    );
  }

  protected async onDelete(driver: Driver): Promise<void> {
    if (this.pending.has(driver.id)) return;
    const deleted = await this.actions.delete(driver, (busy) => this.setBusy(driver.id, busy));
    if (deleted) this.list.reload();
  }

  private setBusy(id: number, busy: boolean): void {
    if (busy) this.pending.add(id);
    else this.pending.delete(id);
  }
}
