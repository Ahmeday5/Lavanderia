import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { ServicesService } from '../../services/services.service';
import { Service } from '../../models/service.model';

/** Common emoji shortlist so admins aren't forced to hunt for a picker. */
export const SERVICE_ICON_SUGGESTIONS = [
  '👕', '👟', '🛋️', '🧹', '🛏️', '🪟', '👔', '✨', '🧺', '🧴', '🧦', '🧵',
];

/**
 * Add/edit modal for a single service. `service` input drives the mode —
 * `null` means "create", any other value pre-fills the form for editing.
 */
@Component({
  selector: 'app-service-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './service-form-modal.component.html',
  styleUrl: './service-form-modal.component.scss',
})
export class ServiceFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicesService = inject(ServicesService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly service = input<Service | null>(null);

  readonly closed = output<void>();
  readonly saved = output<Service>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly iconSuggestions = SERVICE_ICON_SUGGESTIONS;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    icon: ['', [Validators.required, Validators.maxLength(10)]],
  });

  protected readonly isEditMode = () => this.service() !== null;

  constructor() {
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous service's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.service();
        this.serverError.set(null);
        this.form.reset({ name: current?.name ?? '', icon: current?.icon ?? '' });
      },
      { allowSignalWrites: true },
    );
  }

  protected pickIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
    this.form.controls.icon.markAsDirty();
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, icon } = this.form.getRawValue();
    const current = this.service();

    this.serverError.set(null);
    this.isSubmitting.set(true);

    const request$ = current
      ? this.servicesService.update(current.id, { name: name.trim(), icon })
      : this.servicesService.create({ name: name.trim(), icon });

    request$.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.toast.success(current ? 'تم تعديل الخدمة بنجاح' : 'تم إضافة الخدمة بنجاح');
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
