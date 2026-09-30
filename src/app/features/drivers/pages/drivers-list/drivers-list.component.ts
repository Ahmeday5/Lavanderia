import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../../core/services/dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createPagedList } from '../../../../core/utils/paged-list.util';
import { pendingSet } from '../../../../core/utils/pending-set.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { formatDate, formatDateTime } from '../../../../shared/utils/date-format.util';
import { DriversService } from '../../services/drivers.service';
import { Driver } from '../../models/driver.model';
import { OwnerOrdersLinkComponent } from '../../../orders/components/owner-orders-link/owner-orders-link.component';

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PaginationComponent, PhoneActionsComponent, RefreshButtonComponent, OwnerOrdersLinkComponent],
  templateUrl: './drivers-list.component.html',
  styleUrl: './drivers-list.component.scss',
})
export class DriversListComponent {
  private readonly driversService = inject(DriversService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly list = createPagedList((query) => this.driversService.list(query));
  /** ids with an activate/deactivate request in flight. */
  protected readonly pending = pendingSet<number>();

  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '؟';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected async onToggleActive(driver: Driver): Promise<void> {
    if (this.pending.has(driver.id)) return;
    const willActivate = !driver.isActive;
    const name = driver.fullName || 'هذا السائق';

    const confirmed = await this.dialog.confirm({
      title: willActivate ? 'تفعيل السائق' : 'إيقاف السائق',
      message: willActivate
        ? `سيتمكن "${name}" من استقبال طلبات التوصيل فور التفعيل. هل تريد المتابعة؟`
        : `لن يتمكن "${name}" من استقبال أي طلبات توصيل جديدة حتى يُعاد تفعيله. هل أنت متأكد؟`,
      confirmText: willActivate ? 'تفعيل' : 'إيقاف',
      type: willActivate ? 'info' : 'danger',
    });
    if (!confirmed) return;

    this.pending.add(driver.id);
    const request$ = willActivate
      ? this.driversService.activate(driver.id)
      : this.driversService.deactivate(driver.id);

    request$.subscribe({
      next: () => {
        this.pending.delete(driver.id);
        this.list.updateItems((items) =>
          items.map((d) => (d.id === driver.id ? { ...d, isActive: willActivate } : d)),
        );
        this.toast.success(willActivate ? `تم تفعيل ${name} بنجاح` : `تم إيقاف ${name} بنجاح`);
      },
      error: (err: ApiError) => {
        this.pending.delete(driver.id);
        this.toast.error(
          apiErrorToMessage(err, willActivate ? 'تعذّر تفعيل السائق' : 'تعذّر إيقاف السائق'),
        );
      },
    });
  }
}
