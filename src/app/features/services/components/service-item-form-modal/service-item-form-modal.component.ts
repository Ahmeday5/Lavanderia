import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { SavePhase, saveWithImage } from '../../../../core/utils/save-with-image.util';
import { ServiceItemsService } from '../../services/service-items.service';
import { ServicesService } from '../../services/services.service';
import { ServiceItem } from '../../models/service-item.model';
import { Service } from '../../models/service.model';

/**
 * Add/edit modal for a single service item: name, parent service, optional
 * image. `item` input drives the mode — `null` means "create".
 *
 * Like the service modal, a failed image upload after a successful save
 * keeps the modal open on the saved item so only the upload is retried.
 */
@Component({
  selector: 'app-service-item-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    FormErrorComponent,
    SearchableSelectComponent,
    ImagePickerComponent,
  ],
  templateUrl: './service-item-form-modal.component.html',
  styleUrl: './service-item-form-modal.component.scss',
})
export class ServiceItemFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly serviceItemsService = inject(ServiceItemsService);
  private readonly servicesService = inject(ServicesService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly item = input<ServiceItem | null>(null);
  /** Preselected service when creating a new item from a specific service row. */
  readonly defaultServiceId = input<number | null>(null);

  readonly closed = output<void>();
  /** Emitted whenever the server state changed, including a partial (image-failed) save. */
  readonly saved = output<ServiceItem>();

  private readonly picker = viewChild(ImagePickerComponent);

  protected readonly phase = signal<SavePhase | null>(null);
  protected readonly isSubmitting = computed(() => this.phase() !== null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly pendingImage = signal<File | null>(null);

  private readonly persisted = signal<ServiceItem | null>(null);
  protected readonly target = computed(() => this.persisted() ?? this.item());
  protected readonly isEditMode = computed(() => this.target() !== null);

  /**
   * Every service (all pages) for the selector — the parent list is
   * paginated, so its visible rows aren't a complete option set.
   */
  private readonly services = signal<Service[]>([]);
  protected readonly isServicesLoading = signal(false);

  protected readonly serviceOptions = computed<SearchableSelectOption[]>(() =>
    this.services().map((s) => ({ value: s.id, label: s.name })),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    // `0` = nothing selected, which `Validators.required` would accept.
    serviceId: [0, [(c: AbstractControl) => (Number(c.value) > 0 ? null : { required: true })]],
  });

  constructor() {
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous item's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.item();
        const defaultServiceId = this.defaultServiceId();
        untracked(() => {
          this.persisted.set(null);
          this.serverError.set(null);
          this.uploadError.set(null);
          this.pendingImage.set(null);
          this.phase.set(null);
          this.picker()?.reset();
          this.form.reset({
            name: current?.name ?? '',
            serviceId: current?.serviceId ?? defaultServiceId ?? 0,
          });
          this.loadServices();
        });
      },
      { allowSignalWrites: true },
    );
  }

  /** Refreshed on every open (cheap: list pages are HTTP-cached and invalidated on mutation). */
  private loadServices(): void {
    this.isServicesLoading.set(true);
    this.servicesService.listAll().subscribe({
      next: (services) => {
        this.services.set(services);
        this.isServicesLoading.set(false);
      },
      error: () => this.isServicesLoading.set(false),
    });
  }

  protected onImageChange(file: File | null): void {
    this.pendingImage.set(file);
    this.uploadError.set(null);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { serviceId } = this.form.getRawValue();
    const name = this.form.getRawValue().name.trim();
    const target = this.target();
    const file = this.pendingImage();
    const detailsChanged = !target || name !== target.name || serviceId !== target.serviceId;

    if (target && !detailsChanged && !file) {
      this.onClose();
      return;
    }

    this.serverError.set(null);
    this.uploadError.set(null);

    saveWithImage<ServiceItem>({
      save: () => {
        if (!target) return this.serviceItemsService.create({ name, serviceId });
        if (!detailsChanged) return of(target);
        return this.serviceItemsService
          .update(target.id, { name, serviceId })
          .pipe(map((res) => (res.id ? { ...target, ...res } : { ...target, name, serviceId })));
      },
      file,
      upload: (id, image) => this.serviceItemsService.uploadImage(id, image),
      onPhase: (phase) => this.phase.set(phase),
    }).subscribe({
      next: ({ entity, image, imageError }) => {
        this.phase.set(null);

        if (image === 'failed') {
          this.persisted.set(entity);
          this.form.reset({ name: entity.name, serviceId: entity.serviceId });
          this.uploadError.set(apiErrorToMessage(imageError, 'تعذّر رفع الصورة. حاول مرة أخرى.'));
          return;
        }

        if (image === 'no-id') {
          this.toast.warning('تم إضافة الصنف، لكن تعذّر إرفاق الصورة تلقائيًا. افتح الصنف للتعديل ثم ارفع الصورة.');
        } else if (!target) {
          this.toast.success('تم إضافة الصنف بنجاح');
        } else if (image === 'uploaded' && !detailsChanged) {
          this.toast.success('تم تحديث صورة الصنف بنجاح');
        } else {
          this.toast.success('تم حفظ التعديلات بنجاح');
        }
        this.saved.emit(entity);
      },
      error: (err: ApiError) => {
        this.phase.set(null);
        this.serverError.set(apiErrorToMessage(err, 'تعذّر حفظ الصنف. حاول مرة أخرى.'));
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    const persisted = this.persisted();
    if (persisted) {
      this.saved.emit(persisted);
      return;
    }
    this.closed.emit();
  }
}
