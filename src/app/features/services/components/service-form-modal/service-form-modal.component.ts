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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { SavePhase, saveWithImage } from '../../../../core/utils/save-with-image.util';
import { ServicesService } from '../../services/services.service';
import { Service } from '../../models/service.model';

/**
 * Add/edit modal for a single service: name + optional image.
 *
 * Saving is two requests (entity, then `POST /:id/image`). If only the image
 * upload fails, the modal stays open in edit mode on the now-saved service so
 * the user can retry the upload alone — never re-creating a duplicate.
 */
@Component({
  selector: 'app-service-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent, ImagePickerComponent],
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
  /** Emitted whenever the server state changed, including a partial (image-failed) save. */
  readonly saved = output<Service>();

  private readonly picker = viewChild(ImagePickerComponent);

  protected readonly phase = signal<SavePhase | null>(null);
  protected readonly isSubmitting = computed(() => this.phase() !== null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly pendingImage = signal<File | null>(null);

  /** Set once the service exists server-side during this session (after create or a partial save). */
  private readonly persisted = signal<Service | null>(null);
  protected readonly target = computed(() => this.persisted() ?? this.service());
  protected readonly isEditMode = computed(() => this.target() !== null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  constructor() {
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous service's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.service();
        untracked(() => {
          this.persisted.set(null);
          this.serverError.set(null);
          this.uploadError.set(null);
          this.pendingImage.set(null);
          this.phase.set(null);
          this.picker()?.reset();
          this.form.reset({ name: current?.name ?? '' });
        });
      },
      { allowSignalWrites: true },
    );
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

    const name = this.form.getRawValue().name.trim();
    const target = this.target();
    const file = this.pendingImage();
    const nameChanged = !target || name !== target.name;

    if (target && !nameChanged && !file) {
      this.onClose();
      return;
    }

    this.serverError.set(null);
    this.uploadError.set(null);

    saveWithImage<Service>({
      save: () => {
        if (!target) return this.servicesService.create({ name });
        if (!nameChanged) return of(target);
        // Some update endpoints return no body — fall back to the known state.
        return this.servicesService
          .update(target.id, { name })
          .pipe(map((res) => (res.id ? { ...target, ...res } : { ...target, name })));
      },
      file,
      upload: (id, image) => this.servicesService.uploadImage(id, image),
      onPhase: (phase) => this.phase.set(phase),
    }).subscribe({
      next: ({ entity, image, imageError }) => {
        this.phase.set(null);

        if (image === 'failed') {
          this.persisted.set(entity);
          this.form.reset({ name: entity.name });
          this.uploadError.set(apiErrorToMessage(imageError, 'تعذّر رفع الصورة. حاول مرة أخرى.'));
          return;
        }

        if (image === 'no-id') {
          this.toast.warning('تم إنشاء الخدمة، لكن تعذّر إرفاق الصورة تلقائيًا. افتح الخدمة للتعديل ثم ارفع الصورة.');
        } else if (!target) {
          this.toast.success('تم إضافة الخدمة بنجاح');
        } else if (image === 'uploaded' && !nameChanged) {
          this.toast.success('تم تحديث صورة الخدمة بنجاح');
        } else {
          this.toast.success('تم حفظ التعديلات بنجاح');
        }
        this.saved.emit(entity);
      },
      error: (err: ApiError) => {
        this.phase.set(null);
        this.serverError.set(apiErrorToMessage(err, 'تعذّر حفظ الخدمة. حاول مرة أخرى.'));
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    // The service was saved but its image upload failed: the list must still refresh.
    const persisted = this.persisted();
    if (persisted) {
      this.saved.emit(persisted);
      return;
    }
    this.closed.emit();
  }
}
