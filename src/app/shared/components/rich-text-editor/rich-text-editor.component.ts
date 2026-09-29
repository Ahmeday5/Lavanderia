import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type Quill from 'quill';
import { countWords, htmlToPlainText, normalizeEditorHtml } from '../../utils/html-content.util';
import { RICH_TEXT_FORMATS, RICH_TEXT_MODULES, prepareQuill } from './rich-text-editor.config';

/**
 * Word-style WYSIWYG editor that reads and writes an HTML string.
 *
 *   <app-rich-text-editor formControlName="content" [invalid]="ctrl.invalid && ctrl.touched" />
 *
 * Output is normalized for storage (see `normalizeEditorHtml`) and uses inline
 * styles rather than Quill classes, so it renders as-is in any web view.
 * An empty editor yields `''`.
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Styles must reach Quill's runtime-generated toolbar/editor DOM; every
  // rule is scoped under `.rte` so nothing leaks.
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements ControlValueAccessor {
  readonly placeholder = input('ابدأ الكتابة هنا…');
  readonly minHeight = input(380);
  readonly invalid = input(false);
  readonly ariaLabel = input('محرر النص');

  protected readonly modules = RICH_TEXT_MODULES;
  protected readonly formats = RICH_TEXT_FORMATS;
  protected readonly beforeRender = prepareQuill;
  protected readonly valueGetter = (quill: Quill): string =>
    normalizeEditorHtml(quill.getSemanticHTML());

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly ready = signal(false);

  protected readonly stats = computed(() => {
    const text = htmlToPlainText(this.value()).trim();
    return { words: countWords(text), chars: text.length };
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onEditorCreated(quill: Quill): void {
    quill.root.setAttribute('aria-label', this.ariaLabel());
    quill.root.setAttribute('role', 'textbox');
    quill.root.setAttribute('aria-multiline', 'true');
    this.ready.set(true);
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
