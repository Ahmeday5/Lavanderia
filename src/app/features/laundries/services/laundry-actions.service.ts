import { Injectable, inject } from '@angular/core';
import { AccountActionRunner } from '../../accounts/services/account-action-runner.service';
import { accountDeleteConfirmation } from '../../accounts/models/account.model';
import { Laundry } from '../models/laundry.model';
import { LaundriesService } from './laundries.service';

type BusyHandler = (busy: boolean) => void;

/**
 * Admin-only laundry actions with their confirmation copy — shared by the list
 * rows and the details page so both behave (and read) identically.
 * Each resolves `true` once the server accepted the change.
 */
@Injectable({ providedIn: 'root' })
export class LaundryActionsService {
  private readonly laundries = inject(LaundriesService);
  private readonly runner = inject(AccountActionRunner);

  async toggleBan(laundry: Laundry, onBusyChange?: BusyHandler): Promise<boolean> {
    const willBan = !laundry.isBanned;
    const result = await this.runner.run({
      confirm: {
        title: willBan ? 'حظر المغسلة' : 'إلغاء حظر المغسلة',
        message: willBan
          ? `هل أنت متأكد من حظر مغسلة "${laundry.name}"؟ لن تتمكن من استقبال أي طلبات جديدة حتى يتم إلغاء الحظر.`
          : `هل تريد إلغاء حظر مغسلة "${laundry.name}"؟ ستتمكن من العمل على المنصة فورًا.`,
        confirmText: willBan ? 'حظر' : 'إلغاء الحظر',
        type: willBan ? 'danger' : 'info',
      },
      request: () => (willBan ? this.laundries.ban(laundry.id) : this.laundries.unban(laundry.id)),
      successFallback: willBan ? 'تم حظر المغسلة بنجاح' : 'تم إلغاء حظر المغسلة بنجاح',
      errorFallback: willBan ? 'تعذّر حظر المغسلة' : 'تعذّر إلغاء الحظر',
      onBusyChange,
    });
    return result !== null;
  }

  async delete(laundry: Laundry, onBusyChange?: BusyHandler): Promise<boolean> {
    const result = await this.runner.run({
      confirm: accountDeleteConfirmation('المغسلة', laundry.name),
      request: () => this.laundries.delete(laundry.id),
      successFallback: 'تم حذف المغسلة بنجاح',
      errorFallback: 'تعذّر حذف المغسلة',
      onBusyChange,
    });
    return result !== null;
  }
}
