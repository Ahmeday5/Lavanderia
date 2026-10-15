import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { readNavigationState } from '../../../../core/utils/navigation-state.util';
import { createRecordLoader, parseRouteId } from '../../../../core/utils/record-loader.util';
import { ImagePreviewComponent } from '../../../../shared/components/image-preview/image-preview.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { formatMoney } from '../../../../shared/utils/number-format.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { ownerOrdersLink } from '../../../orders/models/order-owner.model';
import {
  DRIVER_IMAGE_LABELS,
  DRIVER_STATE_KEY,
  DriverDetails,
  VEHICLE_TYPE_META,
  driverBadges,
  isLicenseExpired,
} from '../../models/driver.model';
import { DriversService } from '../../services/drivers.service';
import { DriverActionsService } from '../../services/driver-actions.service';

/**
 * `/drivers/:id` — the driver's profile and documents (ID card, licence,
 * vehicle), laid out for review before approval. Every image opens in a
 * lightbox; an expired licence is flagged.
 */
@Component({
  selector: 'app-driver-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AccountPageHeaderComponent, ImagePreviewComponent, PhoneActionsComponent],
  templateUrl: './driver-details.component.html',
  styleUrl: './driver-details.component.scss',
})
export class DriverDetailsComponent {
  private readonly driversService = inject(DriversService);
  private readonly actions = inject(DriverActionsService);
  private readonly router = inject(Router);

  /** Router-bound `:id`. */
  readonly id = input.required<string>();

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly recordId = computed(() => parseRouteId(this.id()));

  protected readonly record = createRecordLoader<DriverDetails>({
    id: () => this.recordId(),
    load: (id) => this.driversService.getById(id),
    seed: readNavigationState<DriverDetails>(DRIVER_STATE_KEY),
  });

  protected readonly isBusy = signal(false);
  protected readonly licenseExpired = computed(() => {
    const driver = this.record.value();
    return driver !== null && isLicenseExpired(driver);
  });

  protected readonly badges = driverBadges;
  protected readonly imageLabels = DRIVER_IMAGE_LABELS;
  protected readonly vehicleMeta = VEHICLE_TYPE_META;
  protected readonly ordersLink = ownerOrdersLink;
  protected readonly money = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected async onToggleActive(driver: DriverDetails): Promise<void> {
    if (this.isBusy()) return;
    const changed = await this.actions.toggleActive(driver, (busy) => this.isBusy.set(busy));
    if (changed) this.record.set({ ...driver, isActive: !driver.isActive });
  }

  protected async onDelete(driver: DriverDetails): Promise<void> {
    if (this.isBusy()) return;
    const deleted = await this.actions.delete(driver, (busy) => this.isBusy.set(busy));
    if (deleted) void this.router.navigate(['/drivers']);
  }
}
