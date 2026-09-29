import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { apiErrorToMessage } from '../../../../core/utils/api-error.util';
import { createEditableResource } from '../../../../core/utils/editable-resource.util';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { formatDateTime } from '../../../../shared/utils/date-format.util';
import { normalizeEditorHtml } from '../../../../shared/utils/html-content.util';
import { sanitizeRichHtml } from '../../../../shared/utils/html-sanitize.util';
import { richTextRequiredValidator } from '../../../../shared/validators/form-validation.util';
import { PrivacyPolicy } from '../../models/privacy-policy.model';
import { PrivacyPolicyService } from '../../services/privacy-policy.service';

type ViewMode = 'edit' | 'preview';

/**
 * Word-style editor for the privacy policy. Content is authored and stored
 * as HTML; the backend serves it to the apps as-is.
 */
@Component({
  selector: 'app-privacy-policy-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RichTextEditorComponent, FormErrorComponent],
  templateUrl: './privacy-policy-settings.component.html',
  styleUrl: './privacy-policy-settings.component.scss',
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(document:keydown.control.s)': 'onSaveShortcut($event)',
    '(document:keydown.meta.s)': 'onSaveShortcut($event)',
  },
})
export class PrivacyPolicySettingsComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly privacyPolicyService = inject(PrivacyPolicyService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly form = this.fb.nonNullable.group({
    content: ['', [richTextRequiredValidator()]],
  });

  private readonly content = toSignal(this.form.controls.content.valueChanges, {
    initialValue: this.form.controls.content.value,
  });

  protected readonly resource = createEditableResource<PrivacyPolicy>({
    load: () => this.privacyPolicyService.get(),
    save: ({ content }) => this.privacyPolicyService.update({ content }),
    onSynced: ({ content }) => this.form.reset({ content }),
  });

  protected readonly mode = signal<ViewMode>('edit');

  protected readonly isDirty = computed(() => {
    const saved = this.resource.saved();
    return saved !== null && normalizeEditorHtml(this.content()) !== normalizeEditorHtml(saved.content);
  });

  protected readonly lastUpdated = computed(() => formatDateTime(this.resource.saved()?.updatedAt));

  /** Only evaluated while the preview is on screen (computeds are lazy). */
  protected readonly previewHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(sanitizeRichHtml(this.content())),
  );

  protected readonly saveErrorMessage = computed(() => {
    const error = this.resource.saveError();
    return error ? apiErrorToMessage(error, 'تعذّر حفظ سياسة الخصوصية، حاول مرة أخرى') : null;
  });

  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }

  protected setMode(mode: ViewMode): void {
    this.mode.set(mode);
  }

  protected async onSubmit(): Promise<void> {
    if (this.resource.isSaving() || !this.isDirty()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mode.set('edit');
      return;
    }

    const saved = await this.resource.save({
      content: normalizeEditorHtml(this.form.controls.content.value),
      updatedAt: null,
    });
    if (saved) this.toast.success('تم حفظ سياسة الخصوصية بنجاح');
  }

  protected onDiscard(): void {
    const saved = this.resource.saved();
    if (!saved) return;
    this.form.reset({ content: saved.content });
    this.resource.clearSaveError();
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
