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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { ImagePickerComponent } from '../../../../shared/components/image-picker/image-picker.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { AdvertisementsService } from '../../services/advertisements.service';
import {
  AD_TARGET_META,
  AD_TARGET_TYPES,
  AdTargetType,
  Advertisement,
} from '../../models/advertisement.model';

const TITLE_MIN = 2;
const TITLE_MAX = 150;

/**
 * Add/edit modal for a single advertisement: title + audience + image.
 *
 * `advertisement` drives the mode — `null` means "create" (image required),
 * any other value pre-fills the form for editing (image optional: omitted
 * means "keep the current one"). Everything is saved in ONE multipart
 * request, so a failure never leaves a half-saved record behind.
 */
@Component({
  selector: 'app-ad-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent, ImagePickerComponent],
  templateUrl: './ad-form-modal.component.html',
  styleUrl: './ad-form-modal.component.scss',
})
export class AdFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adsService = inject(AdvertisementsService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly advertisement = input<Advertisement | null>(null);
  /** Audience pre-selected when creating — typically the list's active filter. */
  readonly defaultTarget = input<AdTargetType | null>(null);

  readonly closed = output<void>();
  readonly saved = output<Advertisement>();

  private readonly picker = viewChild(ImagePickerComponent);

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly isEditMode = computed(() => this.advertisement() !== null);

  protected readonly targets = AD_TARGET_TYPES;
  protected readonly targetMeta = AD_TARGET_META;
  protected readonly titleMax = TITLE_MAX;

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(TITLE_MIN),
      Validators.maxLength(TITLE_MAX),
    ]),
    targetType: this.fb.control<AdTargetType | null>(null, Validators.required),
    /** Holds the validated file from the picker; `required` only in create mode. */
    image: this.fb.control<File | null>(null),
  });

  private readonly titleValue = toSignal(this.form.controls.title.valueChanges, { initialValue: '' });
  protected readonly titleLength = computed(() => this.titleValue().length);

  private readonly pickedImage = signal<File | null>(null);
  /** Set on submit so the "image required" error shows even if the picker was never touched. */
  private readonly submitAttempted = signal(false);
  protected readonly imageError = computed(() =>
    this.submitAttempted() && !this.isEditMode() && !this.pickedImage()
      ? 'صورة الإعلان مطلوبة'
      : null,
  );

  constructor() {
    // Reset on every (re)open. `allowSignalWrites` is required because
    // `form.reset()` synchronously triggers `FormErrorComponent`'s internal
    // tick signal via `ctrl.events` (NG0600 otherwise, see CityFormModal).
    effect(
      () => {
        if (!this.open()) return;
        const current = this.advertisement();
        untracked(() => this.resetFor(current));
      },
      { allowSignalWrites: true },
    );
  }

  protected selectTarget(target: AdTargetType): void {
    if (this.isSubmitting()) return;
    const ctrl = this.form.controls.targetType;
    ctrl.setValue(target);
    ctrl.markAsTouched();
  }

  protected onImageChange(file: File | null): void {
    this.pickedImage.set(file);
    this.form.controls.image.setValue(file);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title: rawTitle, targetType, image } = this.form.getRawValue();
    const title = rawTitle.trim();
    // Guarded by the validators above; narrows the types for the request.
    if (!targetType) return;

    const current = this.advertisement();
    if (current && title === current.title && targetType === current.targetType && !image) {
      this.closed.emit();
      return;
    }

    const request$ = current
      ? this.adsService.update(current.id, { title, targetType, image })
      : image
        ? this.adsService.create({ title, targetType, image })
        : null;
    if (!request$) return;

    this.serverError.set(null);
    this.isSubmitting.set(true);

    request$.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.toast.success(current ? 'تم تعديل الإعلان بنجاح' : 'تم إضافة الإعلان بنجاح');
        this.saved.emit(result);
      },
      error: (err: ApiError) => {
        this.isSubmitting.set(false);
        this.serverError.set(apiErrorToMessage(err, 'تعذّر حفظ الإعلان. حاول مرة أخرى.'));
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }

  private resetFor(current: Advertisement | null): void {
    this.serverError.set(null);
    this.isSubmitting.set(false);
    this.submitAttempted.set(false);
    this.pickedImage.set(null);
    this.picker()?.reset();

    const imageCtrl = this.form.controls.image;
    imageCtrl.setValidators(current ? null : Validators.required);

    this.form.reset({
      title: current?.title ?? '',
      targetType: current ? current.targetType : this.defaultTarget(),
      image: null,
    });
  }
}
