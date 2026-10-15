import { Injectable, inject } from '@angular/core';
import { AccountActionRunner } from '../../accounts/services/account-action-runner.service';
import { accountDeleteConfirmation } from '../../accounts/models/account.model';
import { Driver } from '../models/driver.model';
import { DriversService } from './drivers.service';

type BusyHandler = (busy: boolean) => void;

/**
 * Admin-only driver actions with their confirmation copy — shared by the list
 * rows and the details page. Each resolves `true` once the server accepted it.
 */
@Injectable({ providedIn: 'root' })
export class DriverActionsService {
  private readonly drivers = inject(DriversService);
  private readonly runner = inject(AccountActionRunner);

  /** Approve / activate an inactive driver, or suspend / reject an active one. */
  async toggleActive(driver: Driver, onBusyChange?: BusyHandler): Promise<boolean> {
    const willActivate = !driver.isActive;
    const name = driver.fullName || 'هذا السائق';
    const result = await this.runner.run({
      confirm: {
        title: willActivate ? 'موافقة / تفعيل السائق' : 'إيقاف / رفض السائق',
        message: willActivate
          ? `سيتمكن "${name}" من استقبال طلبات التوصيل فور التفعيل. تأكد من مراجعة مستنداته قبل الموافقة.`
          : `لن يتمكن "${name}" من استقبال أي طلبات توصيل جديدة حتى يُعاد تفعيله. هل أنت متأكد؟`,
        confirmText: willActivate ? 'موافقة وتفعيل' : 'إيقاف',
        type: willActivate ? 'info' : 'danger',
      },
      request: () => (willActivate ? this.drivers.activate(driver.id) : this.drivers.deactivate(driver.id)),
      successFallback: willActivate ? `تم تفعيل ${name} بنجاح` : `تم إيقاف ${name} بنجاح`,
      errorFallback: willActivate ? 'تعذّر تفعيل السائق' : 'تعذّر إيقاف السائق',
      onBusyChange,
    });
    return result !== null;
  }

  async delete(driver: Driver, onBusyChange?: BusyHandler): Promise<boolean> {
    const result = await this.runner.run({
      confirm: accountDeleteConfirmation('السائق', driver.fullName || `#${driver.id}`),
      request: () => this.drivers.delete(driver.id),
      successFallback: 'تم حذف السائق بنجاح',
      errorFallback: 'تعذّر حذف السائق',
      onBusyChange,
    });
    return result !== null;
  }
}
