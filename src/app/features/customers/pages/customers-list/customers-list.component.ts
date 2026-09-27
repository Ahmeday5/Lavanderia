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
import { CustomersService } from '../../services/customers.service';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PaginationComponent, PhoneActionsComponent, RefreshButtonComponent],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent {
  private readonly customersService = inject(CustomersService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly list = createPagedList((query) => this.customersService.list(query));
  protected readonly pending = pendingSet<number>();

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected initials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  protected async onToggleBan(customer: Customer): Promise<void> {
    if (this.pending.has(customer.id)) return;
    const willBan = !customer.isBanned;
    const name = customer.name || 'هذا العميل';

    const confirmed = await this.dialog.confirm({
      title: willBan ? 'حظر العميل' : 'إلغاء حظر العميل',
      message: willBan
        ? `هل أنت متأكد من حظر "${name}"؟ لن يتمكن من إنشاء طلبات جديدة حتى يتم إلغاء الحظر.`
        : `هل تريد إلغاء حظر "${name}"؟ سيتمكن من استخدام التطبيق فورًا.`,
      confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
      type: willBan ? 'danger' : 'info',
    });
    if (!confirmed) return;

    this.pending.add(customer.id);
    const request$ = willBan
      ? this.customersService.ban(customer.id)
      : this.customersService.unban(customer.id);

    request$.subscribe({
      next: () => {
        this.pending.delete(customer.id);
        this.list.updateItems((items) =>
          items.map((c) => (c.id === customer.id ? { ...c, isBanned: willBan } : c)),
        );
        this.toast.success(willBan ? 'تم حظر العميل بنجاح' : 'تم تفعيل العميل بنجاح');
      },
      error: (err: ApiError) => {
        this.pending.delete(customer.id);
        this.toast.error(apiErrorToMessage(err, willBan ? 'تعذّر حظر العميل' : 'تعذّر إلغاء الحظر'));
      },
    });
  }
}
