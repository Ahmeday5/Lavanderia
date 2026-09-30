import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { APP_CURRENCY } from '../../core/constants/currency.constants';
import { isHtmlBlank } from '../utils/html-content.util';
import { parseAmount } from '../utils/number-parse.util';

/**
 * Maps a control's first failing validator into a human-readable message.
 *
 * Use via `<app-form-error [control]="form.controls.email" label="Email" />`
 * or directly: `firstError(ctrl, 'Field')`.
 *
 * Order matters — `required` is checked first so an empty field never gets
 * a "wrong format" message.
 */
export function firstError(
  control: AbstractControl | null | undefined,
  label: string,
  custom?: Record<string, (e: unknown) => string>,
): string | null {
  if (!control) return null;
  if (!(control.dirty || control.touched)) return null;
  if (!control.errors) return null;

  return resolveMessage(control.errors, label, custom);
}

/** Same as `firstError` but ignores touched/dirty — useful for forced display. */
export function firstErrorAlways(
  control: AbstractControl | null | undefined,
  label: string,
  custom?: Record<string, (e: unknown) => string>,
): string | null {
  if (!control?.errors) return null;
  return resolveMessage(control.errors, label, custom);
}

function resolveMessage(
  errors: ValidationErrors,
  label: string,
  custom?: Record<string, (e: unknown) => string>,
): string {
  // Custom keys always win.
  if (custom) {
    for (const key of Object.keys(custom)) {
      if (errors[key] !== undefined) return custom[key](errors[key]);
    }
  }

  if (errors['required'] !== undefined) {
    return `${label} مطلوب`;
  }
  if (errors['email'] !== undefined) {
    return `صيغة ${label} غير صحيحة`;
  }
  if (errors['minlength']) {
    const req = errors['minlength'].requiredLength;
    return `${label} يجب أن يكون ${req} أحرف على الأقل`;
  }
  if (errors['maxlength']) {
    const req = errors['maxlength'].requiredLength;
    return `${label} يجب ألا يزيد عن ${req} حرفًا`;
  }
  if (errors['min'] !== undefined) {
    return `${label} يجب أن يكون ${errors['min'].min} أو أكثر`;
  }
  if (errors['max'] !== undefined) {
    return `${label} يجب أن يكون ${errors['max'].max} أو أقل`;
  }
  if (errors['pattern'] !== undefined) {
    return `صيغة ${label} غير صحيحة`;
  }
  if (errors['mismatch'] !== undefined) {
    return `${label} غير متطابق`;
  }
  if (errors['strongPassword'] !== undefined) {
    return `${label} يجب أن يحتوي على حرف كبير وحرف صغير ورقم، وألا يقل عن 8 أحرف`;
  }
  if (errors['phone'] !== undefined) {
    return `${label} غير صحيح`;
  }
  if (errors['amount'] !== undefined) {
    return `${label} يجب أن يكون قيمة رقمية صالحة (حتى ${APP_CURRENCY.maxFractionDigits} أرقام عشرية)`;
  }

  // Unknown validator — show the raw key as a graceful fallback.
  const firstKey = Object.keys(errors)[0];
  const value = errors[firstKey];
  if (typeof value === 'string') return value;
  return `${label} غير صحيح`;
}

// ─────────────────────── reusable validators ───────────────────────

/** Requires at least one uppercase, one lowercase, one digit, min length 8. */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const longEnough = value.length >= 8;
    return hasUpper && hasLower && hasDigit && longEnough
      ? null
      : { strongPassword: true };
  };
}

/** Basic phone number validator — digits, spaces, `+`, `-`, `()`, 7–15 digits total. */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    const pattern = /^[\d+\-()\s]+$/;
    return pattern.test(value) && digits.length >= 7 && digits.length <= 15
      ? null
      : { phone: true };
  };
}

/**
 * Money amount typed as text (so Arabic-Indic digits and `٫` are accepted —
 * `type="number"` inputs reject them). Invalid format reports `amount`; the
 * range reports the standard `min` / `max` keys so messages stay consistent.
 * Empty values pass — combine with `Validators.required`.
 */
export function amountValidator(range: { min?: number; max?: number } = {}): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value as string | null;
    if (raw == null || raw.trim() === '') return null;

    const amount = parseAmount(raw);
    if (amount === null) return { amount: true };
    if (range.min !== undefined && amount < range.min) return { min: { min: range.min, actual: amount } };
    if (range.max !== undefined && amount > range.max) return { max: { max: range.max, actual: amount } };
    return null;
  };
}

/**
 * `Validators.required` for HTML controls: markup with no visible text
 * (`<p><br></p>`, stray tags, only whitespace) counts as empty. Reports the
 * standard `required` key so `app-form-error` messages stay consistent.
 */
export function richTextRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    isHtmlBlank(control.value as string | null) ? { required: true } : null;
}

/**
 * Cross-field validator: requires `controlName` and `matchControlName` to be
 * equal. Attach to the FormGroup (not an individual control) and read the
 * `mismatch` error off `matchControlName` — e.g.
 *
 *   this.fb.group({ password: [...], confirmPassword: [...] }, {
 *     validators: matchFieldsValidator('password', 'confirmPassword'),
 *   });
 */
export function matchFieldsValidator(
  controlName: string,
  matchControlName: string,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const control = group.get(controlName);
    const matchControl = group.get(matchControlName);
    if (!control || !matchControl) return null;

    if (matchControl.value !== control.value) {
      matchControl.setErrors({ ...matchControl.errors, mismatch: true });
      return { mismatch: true };
    }

    if (matchControl.errors) {
      const { mismatch, ...rest } = matchControl.errors;
      matchControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}
