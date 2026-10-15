import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-response.model';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { ToastService } from '../../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createRecordLoader, parseRouteId } from '../../../../core/utils/record-loader.util';
import { cleanPhone } from '../../../../core/utils/phone.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import {
  amountValidator,
  libyanMobileValidator,
  libyanPhoneValidator,
  numberValidator,
} from '../../../../shared/validators/form-validation.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { PASSWORD_EDIT_HINT, PHONE_EDIT_HINT } from '../../../accounts/models/account.model';
import {
  FormMode,
  amountOrZero,
  coordinatesPairValidator,
  decimalOrNull,
  focusFirstInvalid,
  passwordValidators,
  requiredIdValidator,
  toInputText,
  trimmed,
} from '../../../accounts/utils/account-form.util';
import { CityLookupService } from '../../../cities/services/city-lookup.service';
import { LAUNDRY_STATE_KEY, LaundryDetails, SaveLaundryRequest } from '../../models/laundry.model';
import { LaundriesService } from '../../services/laundries.service';

/**
 * `/laundries/new` and `/laundries/:id/edit` — one form for both modes.
 *
 * Sent as multipart. On edit, a blank password and an untouched image are
 * simply not sent, so the server keeps the current ones. Server validation
 * errors (phone taken, unknown city, …) are toasted and the form stays as
 * typed. Accounts created here are verified right away (no OTP).
 */
@Component({
  selector: 'app-laundry-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AccountPageHeaderComponent,
    FormErrorComponent,
    ImagePickerComponent,
    PasswordInputComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './laundry-form.component.html',
  styleUrl: './laundry-form.component.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class LaundryFormComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly laundriesService = inject(LaundriesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly cities = inject(CityLookupService);

  /** Router-bound `:id` — absent on `/laundries/new`. */
  readonly id = input<string>();

  protected readonly mode = computed<FormMode>(() => (this.id() === undefined ? 'create' : 'edit'));
  protected readonly recordId = computed(() => (this.mode() === 'edit' ? parseRouteId(this.id()) : null));

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, libyanMobileValidator()]],
      password: ['', passwordValidators('create')],
      cityId: [0, [requiredIdValidator]],
      address: ['', [Validators.required, Validators.maxLength(250)]],
      latitude: ['', [numberValidator({ min: -90, max: 90 })]],
      longitude: ['', [numberValidator({ min: -180, max: 180 })]],
      ownerName: ['', [Validators.required, Validators.maxLength(100)]],
      ownerPhoneNumber: ['', [Validators.required, libyanPhoneValidator()]],
      baseDeliveryFee: ['0', [Validators.required, amountValidator({ min: 0 })]],
      deliveryPricePerKm: ['0', [Validators.required, amountValidator({ min: 0 })]],
    },
    { validators: [coordinatesPairValidator()] },
  );

  protected readonly record = createRecordLoader<LaundryDetails>({
    id: () => this.recordId(),
    load: (id) => this.laundriesService.getById(id),
    onLoaded: (laundry) => this.fill(laundry),
  });

  protected readonly pendingImage = signal<File | null>(null);
  protected readonly isSubmitting = signal(false);
  private saved = false;

  protected readonly passwordHint = PASSWORD_EDIT_HINT;
  protected readonly phoneHint = PHONE_EDIT_HINT;

  constructor() {
    this.cities.ensureLoaded();
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form.dirty || this.pendingImage() !== null);
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  /** Normalizes phones once the field is left (Arabic-Indic digits, separators). */
  protected normalizePhone(field: 'phoneNumber' | 'ownerPhoneNumber'): void {
    const control = this.form.controls[field];
    const cleaned = cleanPhone(control.value);
    if (cleaned !== control.value) control.setValue(cleaned);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }

    const id = this.recordId();
    const request = this.toRequest();
    const request$ = id === null
      ? this.laundriesService.create(request)
      : this.laundriesService.update(id, request);

    this.isSubmitting.set(true);
    request$.subscribe({
      next: ({ data, message }) => {
        this.isSubmitting.set(false);
        this.saved = true;
        this.toast.success(message ?? (id === null ? 'تم إضافة المغسلة بنجاح' : 'تم حفظ التعديلات بنجاح'));
        const target = data.id || id;
        void this.router.navigate(target ? ['/laundries', target] : ['/laundries'], {
          state: data.id ? { [LAUNDRY_STATE_KEY]: data } : undefined,
          replaceUrl: id === null,
        });
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حفظ المغسلة. راجع البيانات وحاول مرة أخرى.'));
      },
    });
  }

  private fill(laundry: LaundryDetails): void {
    this.form.controls.password.setValidators(passwordValidators('edit'));
    this.form.reset({
      name: laundry.name,
      phoneNumber: laundry.phoneNumber,
      password: '',
      cityId: laundry.cityId,
      address: laundry.address,
      latitude: toInputText(laundry.latitude),
      longitude: toInputText(laundry.longitude),
      ownerName: laundry.ownerName,
      ownerPhoneNumber: laundry.ownerPhoneNumber,
      baseDeliveryFee: toInputText(laundry.baseDeliveryFee),
      deliveryPricePerKm: toInputText(laundry.deliveryPricePerKm),
    });
  }

  private toRequest(): SaveLaundryRequest {
    const v = this.form.getRawValue();
    return {
      name: trimmed(v.name),
      ownerName: trimmed(v.ownerName),
      ownerPhoneNumber: cleanPhone(v.ownerPhoneNumber),
      phoneNumber: cleanPhone(v.phoneNumber),
      password: v.password.trim() === '' ? null : v.password,
      address: trimmed(v.address),
      cityId: Number(v.cityId),
      latitude: decimalOrNull(v.latitude),
      longitude: decimalOrNull(v.longitude),
      baseDeliveryFee: amountOrZero(v.baseDeliveryFee),
      deliveryPricePerKm: amountOrZero(v.deliveryPricePerKm),
      image: this.pendingImage(),
    };
  }
}
