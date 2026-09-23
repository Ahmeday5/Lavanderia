import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { ServiceItemsService } from '../../services/service-items.service';
import { ServiceItem } from '../../models/service-item.model';
import { Service } from '../../models/service.model';

/**
 * Add/edit modal for a single service item. `item` input drives the mode —
 * `null` means "create", any other value pre-fills the form for editing and
 * lets the item be reassigned to a different service.
 */
@Component({
  selector: 'app-service-item-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent, SearchableSelectComponent],
  templateUrl: './service-item-form-modal.component.html',
  styleUrl: './service-item-form-modal.component.scss',
})
export class ServiceItemFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly serviceItemsService = inject(ServiceItemsService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly item = input<ServiceItem | null>(null);
  /** All services, used to populate the service selector. */
  readonly services = input<Service[]>([]);
  /** Preselected service when creating a new item from a specific service row. */
  readonly defaultServiceId = input<number | null>(null);

  readonly closed = output<void>();
  readonly saved = output<ServiceItem>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly serviceOptions = computed<SearchableSelectOption[]>(() =>
    this.services().map((s) => ({ value: s.id, label: s.name })),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    serviceId: [0, [Validators.required]],
  });

  protected readonly isEditMode = () => this.item() !== null;

  constructor() {
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous item's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.item();
        this.serverError.set(null);
        this.form.reset({
          name: current?.name ?? '',
          serviceId: current?.serviceId ?? this.defaultServiceId() ?? 0,
        });
      },
      { allowSignalWrites: true },
    );
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, serviceId } = this.form.getRawValue();
    const current = this.item();

    this.serverError.set(null);
    this.isSubmitting.set(true);

    const request$ = current
      ? this.serviceItemsService.update(current.id, { name: name.trim(), serviceId })
      : this.serviceItemsService.create({ name: name.trim(), serviceId });

    request$.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.toast.success(current ? 'تم تعديل الصنف بنجاح' : 'تم إضافة الصنف بنجاح');
        this.saved.emit(result);
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.serverError.set(err.message);
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }
}
