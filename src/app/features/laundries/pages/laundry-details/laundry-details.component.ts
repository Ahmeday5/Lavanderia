import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { readNavigationState } from '../../../../core/utils/navigation-state.util';
import { createRecordLoader, parseRouteId } from '../../../../core/utils/record-loader.util';
import { ImagePreviewComponent } from '../../../../shared/components/image-preview/image-preview.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { mapsUrl, toGeoPoint } from '../../../../shared/utils/geo.util';
import { formatMoney } from '../../../../shared/utils/number-format.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { ownerOrdersLink } from '../../../orders/models/order-owner.model';
import { LAUNDRY_STATE_KEY, LaundryDetails, laundryBadges } from '../../models/laundry.model';
import { LaundriesService } from '../../services/laundries.service';
import { LaundryActionsService } from '../../services/laundry-actions.service';

/** `/laundries/:id` — everything about one laundry, plus its admin actions. */
@Component({
  selector: 'app-laundry-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AccountPageHeaderComponent, ImagePreviewComponent, PhoneActionsComponent],
  templateUrl: './laundry-details.component.html',
  styleUrl: './laundry-details.component.scss',
})
export class LaundryDetailsComponent {
  private readonly laundriesService = inject(LaundriesService);
  private readonly actions = inject(LaundryActionsService);
  private readonly router = inject(Router);

  /** Router-bound `:id`. */
  readonly id = input.required<string>();

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly recordId = computed(() => parseRouteId(this.id()));

  protected readonly record = createRecordLoader<LaundryDetails>({
    id: () => this.recordId(),
    load: (id) => this.laundriesService.getById(id),
    seed: readNavigationState<LaundryDetails>(LAUNDRY_STATE_KEY),
  });

  protected readonly isBusy = signal(false);
  protected readonly location = computed(() => {
    const laundry = this.record.value();
    return laundry ? toGeoPoint(laundry.latitude, laundry.longitude) : null;
  });

  protected readonly badges = laundryBadges;
  protected readonly ordersLink = ownerOrdersLink;
  protected readonly mapsUrl = mapsUrl;
  protected readonly money = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected async onToggleBan(laundry: LaundryDetails): Promise<void> {
    if (this.isBusy()) return;
    const changed = await this.actions.toggleBan(laundry, (busy) => this.isBusy.set(busy));
    if (changed) this.record.set({ ...laundry, isBanned: !laundry.isBanned });
  }

  protected async onDelete(laundry: LaundryDetails): Promise<void> {
    if (this.isBusy()) return;
    const deleted = await this.actions.delete(laundry, (busy) => this.isBusy.set(busy));
    if (deleted) void this.router.navigate(['/laundries']);
  }
}
