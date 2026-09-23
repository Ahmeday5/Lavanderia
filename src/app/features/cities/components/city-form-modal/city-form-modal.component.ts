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
import { CitiesService } from '../../services/cities.service';
import { City } from '../../models/city.model';

/**
 * Add/edit modal for a single city. `city` input drives the mode — `null`
 * means "create", any other value pre-fills the form for editing.
 */
@Component({
  selector: 'app-city-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent],
  templateUrl: './city-form-modal.component.html',
  styleUrl: './city-form-modal.component.scss',
})
export class CityFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly citiesService = inject(CitiesService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly city = input<City | null>(null);

  readonly closed = output<void>();
  readonly saved = output<City>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  protected readonly isEditMode = () => this.city() !== null;

  constructor() {
    // Sync form contents whenever the modal is (re)opened for a given city.
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous city's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.city();
        this.serverError.set(null);
        this.form.reset({ name: current?.name ?? '' });
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

    const { name } = this.form.getRawValue();
    const trimmed = name.trim();
    const current = this.city();

    this.serverError.set(null);
    this.isSubmitting.set(true);

    const request$ = current
      ? this.citiesService.update(current.id, { name: trimmed })
      : this.citiesService.create({ name: trimmed });

    request$.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.toast.success(current ? 'تم تعديل المدينة بنجاح' : 'تم إضافة المدينة بنجاح');
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
