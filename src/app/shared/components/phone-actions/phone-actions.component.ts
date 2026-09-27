import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { cleanPhone, copyText, telHref, whatsAppHref } from '../../../core/utils/phone.util';

const COPIED_FEEDBACK_MS = 1600;

/**
 * Phone number with quick actions: copy, call, WhatsApp.
 *
 *   <app-phone-actions [phone]="driver.phoneNumber" [verified]="driver.phoneNumberConfirmed" />
 *
 * WhatsApp is only offered when the number resolves to an international form
 * (see `core/utils/phone.util.ts`); otherwise it's disabled with a reason.
 */
@Component({
  selector: 'app-phone-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './phone-actions.component.html',
  styleUrl: './phone-actions.component.scss',
})
export class PhoneActionsComponent {
  private readonly toast = inject(ToastService);

  readonly phone = input<string | null>(null);
  /** `null` hides the verification badge. */
  readonly verified = input<boolean | null>(null);
  /** Stack the number above the actions (narrow cards). */
  readonly stacked = input(false);

  protected readonly display = computed(() => (this.phone() ?? '').trim());
  protected readonly tel = computed(() => telHref(this.phone()));
  protected readonly whatsApp = computed(() => whatsAppHref(this.phone()));
  protected readonly copied = signal(false);

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
    });
  }

  protected async copy(): Promise<void> {
    const value = cleanPhone(this.phone());
    if (!value) return;
    if (!(await copyText(value))) {
      this.toast.error('تعذّر النسخ — انسخ الرقم يدويًا');
      return;
    }
    this.copied.set(true);
    this.toast.success('تم نسخ رقم الهاتف');
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_FEEDBACK_MS);
  }
}
