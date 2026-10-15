import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { cleanPhone } from '../../../core/utils/phone.util';
import { parseAmount, parseDecimal, parseInteger } from '../../../shared/utils/number-parse.util';
import { ACCOUNT_PASSWORD_MIN_LENGTH } from '../models/account.model';

/**
 * Helpers shared by the laundry / customer / driver forms, which all follow
 * the same create-vs-edit rules.
 */

export type FormMode = 'create' | 'edit';

/** Required (≥ 6 chars) when creating; optional when editing — blank means "keep the current one". */
export function passwordValidators(mode: FormMode): ValidatorFn[] {
  const length = Validators.minLength(ACCOUNT_PASSWORD_MIN_LENGTH);
  return mode === 'create' ? [Validators.required, length] : [length];
}

/** `0` = nothing selected, which `Validators.required` would accept. */
export const requiredIdValidator: ValidatorFn = (control: AbstractControl) =>
  Number(control.value) > 0 ? null : { required: true };

/**
 * Group validator for an optional latitude/longitude pair: both or neither.
 * The missing half gets `required`, so its field shows the usual message.
 */
export function coordinatesPairValidator(latKey = 'latitude', lngKey = 'longitude'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const lat = group.get(latKey);
    const lng = group.get(lngKey);
    if (!lat || !lng) return null;

    const hasLat = String(lat.value ?? '').trim() !== '';
    const hasLng = String(lng.value ?? '').trim() !== '';
    syncRequired(lat, hasLng && !hasLat);
    syncRequired(lng, hasLat && !hasLng);
    return hasLat === hasLng ? null : { coordinatesPair: true };
  };
}

function syncRequired(control: AbstractControl, missing: boolean): void {
  const errors = control.errors ?? {};
  if (missing && !errors['required']) {
    control.setErrors({ ...errors, required: true });
  } else if (!missing && errors['required'] && String(control.value ?? '').trim() !== '') {
    const { required: _removed, ...rest } = errors;
    control.setErrors(Object.keys(rest).length ? rest : null);
  }
}

// ── value normalization (form text → request) ──

export function trimmed(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Blank → `null`, so an optional field is simply not sent. */
export function trimmedOrNull(value: string | null | undefined): string | null {
  const text = trimmed(value);
  return text === '' ? null : text;
}

/** Phone as digits (Arabic-Indic converted, separators dropped, leading `+` kept). */
export function normalizedPhone(value: string | null | undefined): string {
  return cleanPhone(value);
}

export function decimalOrNull(value: string | null | undefined): number | null {
  return trimmed(value) === '' ? null : parseDecimal(value);
}

export function integerOrNull(value: string | null | undefined): number | null {
  return trimmed(value) === '' ? null : parseInteger(value);
}

export function amountOrZero(value: string | null | undefined): number {
  return parseAmount(value) ?? 0;
}

/** Number → form text (`null` → `''`). */
export function toInputText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Moves focus to the first invalid control after a rejected submit, so the
 * admin lands on what to fix on long forms instead of hunting for it.
 */
export function focusFirstInvalid(host: HTMLElement): void {
  queueMicrotask(() => {
    const target = host.querySelector<HTMLElement>(
      'input.ng-invalid, select.ng-invalid, textarea.ng-invalid, .ng-invalid button, .ng-invalid input',
    );
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
