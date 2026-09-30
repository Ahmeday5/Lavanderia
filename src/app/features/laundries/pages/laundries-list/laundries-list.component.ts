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
import { LaundriesService } from '../../services/laundries.service';
import { Laundry } from '../../models/laundry.model';
import { OwnerOrdersLinkComponent } from '../../../orders/components/owner-orders-link/owner-orders-link.component';

@Component({
  selector: 'app-laundries-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PaginationComponent, PhoneActionsComponent, RefreshButtonComponent, OwnerOrdersLinkComponent],
  templateUrl: './laundries-list.component.html',
  styleUrl: './laundries-list.component.scss',
})
export class LaundriesListComponent {
  private readonly laundriesService = inject(LaundriesService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly list = createPagedList((query) => this.laundriesService.list(query));
  protected readonly pending = pendingSet<number>();

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected async onToggleBan(laundry: Laundry): Promise<void> {
    if (this.pending.has(laundry.id)) return;
    const willBan = !laundry.isBanned;

    const confirmed = await this.dialog.confirm({
      title: willBan ? 'حظر المغسلة' : 'إلغاء حظر المغسلة',
      message: willBan
        ? `هل أنت متأكد من حظر مغسلة "${laundry.name}"؟ لن تتمكن من استقبال أي طلبات جديدة حتى يتم إلغاء الحظر.`
        : `هل تريد إلغاء حظر مغسلة "${laundry.name}"؟ ستتمكن من العمل على المنصة فورًا.`,
      confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
      type: willBan ? 'danger' : 'info',
    });
    if (!confirmed) return;

    this.pending.add(laundry.id);
    const request$ = willBan
      ? this.laundriesService.ban(laundry.id)
      : this.laundriesService.unban(laundry.id);

    request$.subscribe({
      next: () => {
        this.pending.delete(laundry.id);
        this.list.updateItems((items) =>
          items.map((l) => (l.id === laundry.id ? { ...l, isBanned: willBan } : l)),
        );
        this.toast.success(willBan ? 'تم حظر المغسلة بنجاح' : 'تم تفعيل المغسلة بنجاح');
      },
      error: (err: ApiError) => {
        this.pending.delete(laundry.id);
        this.toast.error(apiErrorToMessage(err, willBan ? 'تعذّر حظر المغسلة' : 'تعذّر إلغاء الحظر'));
      },
    });
  }
}
