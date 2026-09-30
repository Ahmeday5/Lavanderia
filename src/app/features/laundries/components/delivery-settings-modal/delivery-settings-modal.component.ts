import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { APP_CURRENCY } from '../../../../core/constants/currency.constants';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createEditableResource } from '../../../../core/utils/editable-resource.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { formatMoney } from '../../../../shared/utils/number-format.util';
import { parseAmount } from '../../../../shared/utils/number-parse.util';
import { amountValidator } from '../../../../shared/validators/form-validation.util';
import {
  DeliverySettings,
  MINIMUM_DELIVERY_FEE_LIMITS,
  MINIMUM_FEE_DISTANCE_KM,
} from '../../models/delivery-settings.model';
import { DeliverySettingsService } from '../../services/delivery-settings.service';

/**
 * Edits the platform-wide minimum delivery fee — the flat amount charged when
 * the delivery distance is under `MINIMUM_FEE_DISTANCE_KM`.
 *
 * Render it conditionally (`@if (open) { <app-delivery-settings-modal /> }`):
 * the current value is fetched fresh each time the modal is created.
 */
@Component({
  selector: 'app-delivery-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './delivery-settings-modal.component.html',
  styleUrl: './delivery-settings-modal.component.scss',
})
export class DeliverySettingsModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly deliverySettingsService = inject(DeliverySettingsService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();

  protected readonly thresholdKm = MINIMUM_FEE_DISTANCE_KM;
  protected readonly currencySymbol = APP_CURRENCY.symbol;
  protected readonly money = formatMoney;

  protected readonly form = this.fb.nonNullable.group({
    minimumDeliveryFee: ['', [Validators.required, amountValidator(MINIMUM_DELIVERY_FEE_LIMITS)]],
  });

  private readonly feeInput = toSignal(this.form.controls.minimumDeliveryFee.valueChanges, {
    initialValue: this.form.controls.minimumDeliveryFee.value,
  });

  /** Parsed draft — `null` while the input isn't a valid amount. */
  protected readonly draftFee = computed(() => parseAmount(this.feeInput()));

  protected readonly resource = createEditableResource<DeliverySettings>({
    load: () => this.deliverySettingsService.get(),
    save: (value) => this.deliverySettingsService.update(value),
    onSynced: ({ minimumDeliveryFee }) =>
      this.form.reset({ minimumDeliveryFee: String(minimumDeliveryFee) }),
  });

  protected readonly isDirty = computed(() => {
    const saved = this.resource.saved();
    return saved !== null && this.draftFee() !== saved.minimumDeliveryFee;
  });

  protected readonly canSave = computed(
    () => this.resource.status() === 'ready' && this.isDirty() && !this.resource.isSaving(),
  );

  protected readonly saveErrorMessage = computed(() => {
    const error = this.resource.saveError();
    return error ? apiErrorToMessage(error, 'تعذّر حفظ الحد الأدنى للتوصيل، حاول مرة أخرى') : null;
  });

  protected async onSubmit(): Promise<void> {
    if (!this.canSave()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fee = this.draftFee();
    if (fee === null) return;

    const saved = await this.resource.save({ minimumDeliveryFee: fee });
    if (!saved) return;

    this.toast.success(`تم تحديث الحد الأدنى للتوصيل إلى ${formatMoney(fee)}`);
    this.closed.emit();
  }

  /** Rewrites `٧٫٥` / `7,50` as `7.5` once the admin leaves the field. */
  protected normalizeFee(): void {
    const control = this.form.controls.minimumDeliveryFee;
    const amount = parseAmount(control.value);
    if (amount === null) return;
    const canonical = String(amount);
    if (canonical !== control.value) control.setValue(canonical);
  }

  protected onClose(): void {
    if (this.resource.isSaving()) return;
    this.closed.emit();
  }
}
