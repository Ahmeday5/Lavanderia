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
import { cleanPhone } from '../../../../core/utils/phone.util';
import { createRecordLoader, parseRouteId } from '../../../../core/utils/record-loader.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import {
  libyanMobileValidator,
  numberValidator,
} from '../../../../shared/validators/form-validation.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { PASSWORD_EDIT_HINT, PHONE_EDIT_HINT } from '../../../accounts/models/account.model';
import {
  FormMode,
  coordinatesPairValidator,
  decimalOrNull,
  focusFirstInvalid,
  passwordValidators,
  requiredIdValidator,
  toInputText,
  trimmed,
} from '../../../accounts/utils/account-form.util';
import { CityLookupService } from '../../../cities/services/city-lookup.service';
import { CUSTOMER_STATE_KEY, CustomerDetails, SaveCustomerRequest } from '../../models/customer.model';
import { CustomersService } from '../../services/customers.service';

/**
 * `/customers/new` and `/customers/:id/edit` — one form for both modes (JSON).
 * A blank password on edit is sent as `null`, keeping the current one.
 * Server validation errors are toasted; the form stays as typed.
 */
@Component({
  selector: 'app-customer-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AccountPageHeaderComponent,
    FormErrorComponent,
    PasswordInputComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class CustomerFormComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly cities = inject(CityLookupService);

  /** Router-bound `:id` — absent on `/customers/new`. */
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
    },
    { validators: [coordinatesPairValidator()] },
  );

  protected readonly record = createRecordLoader<CustomerDetails>({
    id: () => this.recordId(),
    load: (id) => this.customersService.getById(id),
    onLoaded: (customer) => this.fill(customer),
  });

  protected readonly isSubmitting = signal(false);
  private saved = false;

  protected readonly passwordHint = PASSWORD_EDIT_HINT;
  protected readonly phoneHint = PHONE_EDIT_HINT;

  constructor() {
    this.cities.ensureLoaded();
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && this.form.dirty;
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  protected normalizePhone(): void {
    const control = this.form.controls.phoneNumber;
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
      ? this.customersService.create(request)
      : this.customersService.update(id, request);

    this.isSubmitting.set(true);
    request$.subscribe({
      next: ({ data, message }) => {
        this.isSubmitting.set(false);
        this.saved = true;
        this.toast.success(message ?? (id === null ? 'تم إضافة العميل بنجاح' : 'تم حفظ التعديلات بنجاح'));
        const target = data.id || id;
        void this.router.navigate(target ? ['/customers', target] : ['/customers'], {
          state: data.id ? { [CUSTOMER_STATE_KEY]: data } : undefined,
          replaceUrl: id === null,
        });
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حفظ العميل. راجع البيانات وحاول مرة أخرى.'));
      },
    });
  }

  private fill(customer: CustomerDetails): void {
    this.form.controls.password.setValidators(passwordValidators('edit'));
    this.form.reset({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      password: '',
      cityId: customer.cityId,
      address: customer.address,
      latitude: toInputText(customer.latitude),
      longitude: toInputText(customer.longitude),
    });
  }

  private toRequest(): SaveCustomerRequest {
    const v = this.form.getRawValue();
    return {
      name: trimmed(v.name),
      phoneNumber: cleanPhone(v.phoneNumber),
      password: v.password.trim() === '' ? null : v.password,
      address: trimmed(v.address),
      cityId: Number(v.cityId),
      latitude: decimalOrNull(v.latitude),
      longitude: decimalOrNull(v.longitude),
    };
  }
}
