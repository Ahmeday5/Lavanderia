import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ToastService } from '../../../../core/services/toast.service';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createEditableResource } from '../../../../core/utils/editable-resource.util';
import { cleanPhone } from '../../../../core/utils/phone.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PhoneActionsComponent } from '../../../../shared/components/phone-actions/phone-actions.component';
import { phoneValidator } from '../../../../shared/validators/form-validation.util';
import { ContactInfo } from '../../models/contact-info.model';
import { ContactInfoService } from '../../services/contact-info.service';

type PhoneField = 'phoneNumber1' | 'phoneNumber2';

/** Canonical form of the record — what is sent, and what "unchanged" is compared on. */
function normalizeContactInfo(value: ContactInfo): ContactInfo {
  return {
    phoneNumber1: cleanPhone(value.phoneNumber1),
    phoneNumber2: cleanPhone(value.phoneNumber2),
    email: value.email.trim(),
  };
}

function sameContactInfo(a: ContactInfo, b: ContactInfo): boolean {
  return (
    a.phoneNumber1 === b.phoneNumber1 &&
    a.phoneNumber2 === b.phoneNumber2 &&
    a.email.toLowerCase() === b.email.toLowerCase()
  );
}

/** Edits the support phones/email shown to customers and drivers in the apps. */
@Component({
  selector: 'app-contact-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormErrorComponent, PhoneActionsComponent],
  templateUrl: './contact-settings.component.html',
  styleUrl: './contact-settings.component.scss',
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(document:keydown.control.s)': 'onSaveShortcut($event)',
    '(document:keydown.meta.s)': 'onSaveShortcut($event)',
  },
})
export class ContactSettingsComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly contactInfoService = inject(ContactInfoService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.nonNullable.group({
    phoneNumber1: ['', [Validators.required, phoneValidator()]],
    phoneNumber2: ['', [phoneValidator()]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  /** Live, normalized form value — drives the preview and dirty tracking. */
  protected readonly draft = toSignal(
    this.form.valueChanges.pipe(map(() => normalizeContactInfo(this.form.getRawValue()))),
    { initialValue: normalizeContactInfo(this.form.getRawValue()) },
  );

  protected readonly resource = createEditableResource<ContactInfo>({
    load: () => this.contactInfoService.get(),
    save: (value) => this.contactInfoService.update(value),
    onSynced: (value) => this.form.reset(value),
  });

  protected readonly isDirty = computed(() => {
    const saved = this.resource.saved();
    return saved !== null && !sameContactInfo(this.draft(), normalizeContactInfo(saved));
  });

  protected readonly saveErrorMessage = computed(() => {
    const error = this.resource.saveError();
    return error ? apiErrorToMessage(error, 'تعذّر حفظ بيانات التواصل، حاول مرة أخرى') : null;
  });

  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }

  protected async onSubmit(): Promise<void> {
    if (this.resource.isSaving() || !this.isDirty()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const saved = await this.resource.save(normalizeContactInfo(this.form.getRawValue()));
    if (saved) this.toast.success('تم حفظ بيانات التواصل بنجاح');
  }

  protected onDiscard(): void {
    const saved = this.resource.saved();
    if (!saved) return;
    this.form.reset(saved);
    this.resource.clearSaveError();
  }

  /** Converts Arabic-Indic digits / strips separators once the user leaves the field. */
  protected normalizePhone(field: PhoneField): void {
    const control = this.form.controls[field];
    const cleaned = cleanPhone(control.value);
    if (cleaned !== control.value) control.setValue(cleaned);
  }

  protected onSaveShortcut(event: Event): void {
    if (this.resource.status() !== 'ready') return;
    event.preventDefault();
    void this.onSubmit();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  }
}
