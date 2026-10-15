import { Injectable, inject } from '@angular/core';
import { AccountActionRunner } from '../../accounts/services/account-action-runner.service';
import { accountDeleteConfirmation } from '../../accounts/models/account.model';
import { Customer } from '../models/customer.model';
import { CustomersService } from './customers.service';

type BusyHandler = (busy: boolean) => void;

/**
 * Admin-only customer actions with their confirmation copy — shared by the
 * list rows and the details page. Each resolves `true` once the server
 * accepted the change.
 */
@Injectable({ providedIn: 'root' })
export class CustomerActionsService {
  private readonly customers = inject(CustomersService);
  private readonly runner = inject(AccountActionRunner);

  async toggleBan(customer: Customer, onBusyChange?: BusyHandler): Promise<boolean> {
    const willBan = !customer.isBanned;
    const name = customer.name || 'هذا العميل';
    const result = await this.runner.run({
      confirm: {
        title: willBan ? 'حظر العميل' : 'إلغاء حظر العميل',
        message: willBan
          ? `هل أنت متأكد من حظر "${name}"؟ لن يتمكن من إنشاء طلبات جديدة حتى يتم إلغاء الحظر.`
          : `هل تريد إلغاء حظر "${name}"؟ سيتمكن من استخدام التطبيق فورًا.`,
        confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
        type: willBan ? 'danger' : 'info',
      },
      request: () => (willBan ? this.customers.ban(customer.id) : this.customers.unban(customer.id)),
      successFallback: willBan ? 'تم حظر العميل بنجاح' : 'تم إلغاء حظر العميل بنجاح',
      errorFallback: willBan ? 'تعذّر حظر العميل' : 'تعذّر إلغاء الحظر',
      onBusyChange,
    });
    return result !== null;
  }

  async delete(customer: Customer, onBusyChange?: BusyHandler): Promise<boolean> {
    const result = await this.runner.run({
      confirm: accountDeleteConfirmation('العميل', customer.name || `#${customer.id}`),
      request: () => this.customers.delete(customer.id),
      successFallback: 'تم حذف العميل بنجاح',
      errorFallback: 'تعذّر حذف العميل',
      onBusyChange,
    });
    return result !== null;
  }
}
