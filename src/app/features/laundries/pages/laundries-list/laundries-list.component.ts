import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { DeliverySettingsModalComponent } from '../../components/delivery-settings-modal/delivery-settings-modal.component';
import { Laundry, laundryBadges } from '../../models/laundry.model';
import { LaundriesService } from '../../services/laundries.service';
import { LaundryActionsService } from '../../services/laundry-actions.service';

/**
 * Laundries — `/laundries?search=…`. Server search & pagination; the search
 * lives in the URL so global-search "عرض الكل" links land pre-filtered.
 * Deleted accounts are view-only; ban & delete are Admin-only.
 */
@Component({
  selector: 'app-laundries-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    PaginationComponent,
    PhoneActionsComponent,
    RefreshButtonComponent,
    OwnerOrdersLinkComponent,
    DeliverySettingsModalComponent,
    AccountBadgesComponent,
    DeletedToggleComponent,
  ],
  templateUrl: './laundries-list.component.html',
  styleUrl: './laundries-list.component.scss',
})
export class LaundriesListComponent {
  private readonly laundriesService = inject(LaundriesService);
  private readonly actions = inject(LaundryActionsService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly accounts = createAccountList((query) => this.laundriesService.list(query));
  protected readonly list = this.accounts.list;
  protected readonly includeDeleted = this.accounts.includeDeleted;

  protected readonly pending = pendingSet<number>();
  protected readonly isDeliverySettingsOpen = signal(false);

  protected readonly pageSizeOptions = ACCOUNT_PAGE_SIZE_OPTIONS;
  protected readonly badges = laundryBadges;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected async onToggleBan(laundry: Laundry): Promise<void> {
    if (this.pending.has(laundry.id)) return;
    const changed = await this.actions.toggleBan(laundry, (busy) => this.setBusy(laundry.id, busy));
    if (!changed) return;
    this.list.updateItems((items) =>
      items.map((l) => (l.id === laundry.id ? { ...l, isBanned: !laundry.isBanned } : l)),
    );
  }

  protected async onDelete(laundry: Laundry): Promise<void> {
    if (this.pending.has(laundry.id)) return;
    const deleted = await this.actions.delete(laundry, (busy) => this.setBusy(laundry.id, busy));
    if (deleted) this.list.reload();
  }

  private setBusy(id: number, busy: boolean): void {
    if (busy) this.pending.add(id);
    else this.pending.delete(id);
  }
}
