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
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { todayIsoDate } from '../../../../shared/utils/date-iso.util';
import {
  dateOrderValidator,
  libyanMobileValidator,
  numberValidator,
} from '../../../../shared/validators/form-validation.util';
import { AccountPageHeaderComponent } from '../../../accounts/components/account-page-header/account-page-header.component';
import { PASSWORD_EDIT_HINT, PHONE_EDIT_HINT } from '../../../accounts/models/account.model';
import {
  FormMode,
  focusFirstInvalid,
  integerOrNull,
  passwordValidators,
  requiredIdValidator,
  toInputText,
  trimmed,
  trimmedOrNull,
} from '../../../accounts/utils/account-form.util';
import { CityLookupService } from '../../../cities/services/city-lookup.service';
import {
  DRIVER_IMAGE_LABELS,
  DRIVER_STATE_KEY,
  DriverDetails,
  DriverImageField,
  SaveDriverRequest,
  VEHICLE_TYPES,
  VEHICLE_TYPE_META,
  VehicleType,
} from '../../models/driver.model';
import { DriversService } from '../../services/drivers.service';

const LICENSE_ORDER_MESSAGE = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار';
const FIRST_VEHICLE_YEAR = 1950;

/**
 * `/drivers/new` (Admin-only, see routes) and `/drivers/:id/edit`.
 *
 * Sent as multipart. On edit only the images that were re-picked are sent
 * and a blank password is omitted, so everything else stays as stored.
 * `isActive` ("activate right away") is a create-time choice only.
 */
@Component({
  selector: 'app-driver-form',
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
  templateUrl: './driver-form.component.html',
  styleUrl: './driver-form.component.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class DriverFormComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly driversService = inject(DriversService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly cities = inject(CityLookupService);

  /** Router-bound `:id` — absent on `/drivers/new`. */
  readonly id = input<string>();

  protected readonly mode = computed<FormMode>(() => (this.id() === undefined ? 'create' : 'edit'));
  protected readonly recordId = computed(() => (this.mode() === 'edit' ? parseRouteId(this.id()) : null));

  protected readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, libyanMobileValidator()]],
      password: ['', passwordValidators('create')],
      nationalId: ['', [Validators.required, Validators.maxLength(30)]],
      dateOfBirth: [''],
      cityId: [0, [requiredIdValidator]],
      address: ['', [Validators.required, Validators.maxLength(250)]],
      licenseIssueDate: [''],
      licenseExpiryDate: [''],
      vehicleType: this.fb.nonNullable.control<VehicleType>('Car', Validators.required),
      vehicleMake: ['', [Validators.required, Validators.maxLength(50)]],
      vehicleModel: ['', [Validators.required, Validators.maxLength(50)]],
      vehicleYear: [
        '',
        [numberValidator({ integer: true, min: FIRST_VEHICLE_YEAR, max: new Date().getFullYear() + 1 })],
      ],
      vehicleColor: ['', [Validators.maxLength(30)]],
      plateNumber: ['', [Validators.required, Validators.maxLength(20)]],
      isActive: [true],
    },
    { validators: [dateOrderValidator('licenseIssueDate', 'licenseExpiryDate', LICENSE_ORDER_MESSAGE)] },
  );

  protected readonly record = createRecordLoader<DriverDetails>({
    id: () => this.recordId(),
    load: (id) => this.driversService.getById(id),
    onLoaded: (driver) => this.fill(driver),
  });

  /** Images re-picked in this session — the only ones sent. */
  protected readonly pendingImages = signal<Partial<Record<DriverImageField, File>>>({});
  protected readonly isSubmitting = signal(false);
  private saved = false;

  protected readonly vehicleTypes = VEHICLE_TYPES;
  protected readonly vehicleMeta = VEHICLE_TYPE_META;
  protected readonly imageLabels = DRIVER_IMAGE_LABELS;
  protected readonly today = todayIsoDate();
  protected readonly passwordHint = PASSWORD_EDIT_HINT;
  protected readonly phoneHint = PHONE_EDIT_HINT;

  constructor() {
    this.cities.ensureLoaded();
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form.dirty || Object.keys(this.pendingImages()).length > 0);
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  protected currentImage(field: DriverImageField): string | null {
    return this.record.value()?.images[field] ?? null;
  }

  protected onImagePicked(field: DriverImageField, file: File | null): void {
    this.pendingImages.update((images) => {
      const next = { ...images };
      if (file) next[field] = file;
      else delete next[field];
      return next;
    });
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
      ? this.driversService.create(request)
      : this.driversService.update(id, request);

    this.isSubmitting.set(true);
    request$.subscribe({
      next: ({ data, message }) => {
        this.isSubmitting.set(false);
        this.saved = true;
        this.toast.success(message ?? (id === null ? 'تم إضافة السائق بنجاح' : 'تم حفظ التعديلات بنجاح'));
        const target = data.id || id;
        void this.router.navigate(target ? ['/drivers', target] : ['/drivers'], {
          state: data.id ? { [DRIVER_STATE_KEY]: data } : undefined,
          replaceUrl: id === null,
        });
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.toast.error(apiErrorToMessage(err, 'تعذّر حفظ السائق. راجع البيانات وحاول مرة أخرى.'));
      },
    });
  }

  private fill(driver: DriverDetails): void {
    this.form.controls.password.setValidators(passwordValidators('edit'));
    this.form.reset({
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      password: '',
      nationalId: driver.nationalId,
      dateOfBirth: driver.dateOfBirth ?? '',
      cityId: driver.cityId,
      address: driver.address,
      licenseIssueDate: driver.licenseIssueDate ?? '',
      licenseExpiryDate: driver.licenseExpiryDate ?? '',
      vehicleType: driver.vehicleType ?? 'Car',
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      vehicleYear: toInputText(driver.vehicleYear),
      vehicleColor: driver.vehicleColor,
      plateNumber: driver.plateNumber,
      isActive: driver.isActive,
    });
  }

  private toRequest(): SaveDriverRequest {
    const v = this.form.getRawValue();
    const isCreate = this.mode() === 'create';
    return {
      fullName: trimmed(v.fullName),
      phoneNumber: cleanPhone(v.phoneNumber),
      password: v.password.trim() === '' ? null : v.password,
      nationalId: trimmed(v.nationalId),
      dateOfBirth: trimmedOrNull(v.dateOfBirth),
      cityId: Number(v.cityId),
      address: trimmed(v.address),
      licenseIssueDate: trimmedOrNull(v.licenseIssueDate),
      licenseExpiryDate: trimmedOrNull(v.licenseExpiryDate),
      vehicleType: v.vehicleType,
      vehicleMake: trimmed(v.vehicleMake),
      vehicleModel: trimmed(v.vehicleModel),
      vehicleYear: integerOrNull(v.vehicleYear),
      vehicleColor: trimmedOrNull(v.vehicleColor),
      plateNumber: trimmed(v.plateNumber),
      images: this.pendingImages(),
      isActive: isCreate ? v.isActive : undefined,
    };
  }
}
