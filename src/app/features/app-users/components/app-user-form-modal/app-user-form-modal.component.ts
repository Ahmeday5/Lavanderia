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
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { strongPasswordValidator } from '../../../../shared/validators/form-validation.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError } from '../../../../core/models/api-response.model';
import { AppUsersService } from '../../services/app-users.service';
import { AppUser, APP_USER_ROLES } from '../../models/app-user.model';

/**
 * Add/edit modal for a dashboard admin user. `user` input drives the mode —
 * `null` means "create" (email + password + role), any other value pre-fills
 * the form for editing (email + role only — password changes are out of
 * scope for this form).
 */
@Component({
  selector: 'app-app-user-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormErrorComponent, PasswordInputComponent],
  templateUrl: './app-user-form-modal.component.html',
  styleUrl: './app-user-form-modal.component.scss',
})
export class AppUserFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly appUsersService = inject(AppUsersService);
  private readonly toast = inject(ToastService);

  readonly open = input.required<boolean>();
  readonly user = input<AppUser | null>(null);

  readonly closed = output<void>();
  readonly saved = output<AppUser>();

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly roles = APP_USER_ROLES;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPasswordValidator()]],
    role: this.fb.nonNullable.control<string>('Admin', [Validators.required]),
  });

  protected readonly isEditMode = () => this.user() !== null;

  constructor() {
    // `allowSignalWrites` is required because `form.reset()` synchronously
    // triggers `FormErrorComponent`'s internal tick signal via `ctrl.events`
    // — without it Angular throws NG0600 and the reset silently never runs,
    // leaving the previous user's value stuck in the form.
    effect(
      () => {
        if (!this.open()) return;
        const current = this.user();
        this.serverError.set(null);

        // Password is only collected on create — drop it entirely (and its
        // validator) when editing so a blank field never blocks submission.
        const passwordControl = this.form.controls.password;
        if (current) {
          passwordControl.clearValidators();
        } else {
          passwordControl.setValidators([Validators.required, strongPasswordValidator()]);
        }
        passwordControl.updateValueAndValidity({ emitEvent: false });

        this.form.reset({
          email: current?.email ?? '',
          password: '',
          role: current?.role ?? 'Admin',
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

    const { email, password, role } = this.form.getRawValue();
    const current = this.user();

    this.serverError.set(null);
    this.isSubmitting.set(true);

    const request$ = current
      ? this.appUsersService.update(current.id, { email: email.trim(), role: role as AppUser['role'] })
      : this.appUsersService.create({ email: email.trim(), password, role: role as AppUser['role'] });

    request$.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.toast.success(current ? 'تم تعديل المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح');
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
