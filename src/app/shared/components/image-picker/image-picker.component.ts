import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_UPLOAD_RULES,
  SUPPORTED_IMAGE_LABEL,
  formatBytes,
  prepareImageUpload,
} from '../../../core/utils/image-file.util';

/**
 * Image field with preview, drag & drop, and strict client-side validation.
 *
 *   <app-image-picker
 *     label="صورة الخدمة"
 *     [currentUrl]="service?.imageUrl ?? null"
 *     [busy]="isUploading()"
 *     [error]="uploadError()"
 *     (fileChange)="pendingImage.set($event)" />
 *
 * It only *selects* a file — the parent decides when to upload it (usually
 * right after saving the entity). Emits a validated, normalized `File`, or
 * `null` when the user discards their pick. Call `reset()` when the hosting
 * form reopens: projected modal content outlives each open/close cycle.
 */
@Component({
  selector: 'app-image-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-picker.component.html',
  styleUrl: './image-picker.component.scss',
})
export class ImagePickerComponent {
  readonly label = input('الصورة');
  /** Image already stored on the server, shown until a new file is picked. */
  readonly currentUrl = input<string | null>(null);
  readonly disabled = input(false);
  /** Parent is uploading the picked file. */
  readonly busy = input(false);
  /** External (server-side) error to show, e.g. a rejected upload. */
  readonly error = input<string | null>(null);

  readonly fileChange = output<File | null>();

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly accept = IMAGE_ACCEPT_ATTR;
  protected readonly hint = `${SUPPORTED_IMAGE_LABEL} — حتى ${formatBytes(IMAGE_UPLOAD_RULES.maxBytes)}`;

  protected readonly pendingFile = signal<File | null>(null);
  protected readonly pendingPreview = signal<string | null>(null);
  protected readonly pendingMeta = signal<string | null>(null);
  protected readonly isValidating = signal(false);
  protected readonly localError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly isDragOver = signal(false);
  /** Set when the stored image URL fails to load (deleted file, bad host, …). */
  protected readonly currentBroken = signal<string | null>(null);

  protected readonly previewUrl = computed(() => {
    const pending = this.pendingPreview();
    if (pending) return pending;
    const current = this.currentUrl();
    return current && current !== this.currentBroken() ? current : null;
  });

  protected readonly shownError = computed(() => this.localError() ?? this.error());
  protected readonly isLocked = computed(() => this.disabled() || this.busy() || this.isValidating());

  /** Guards against a slow validation of an older pick overwriting a newer one. */
  private selectionSeq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreview());
  }

  /** Discards any pending pick and messages (does not emit). */
  reset(): void {
    this.selectionSeq++;
    this.revokePreview();
    this.pendingFile.set(null);
    this.pendingMeta.set(null);
    this.localError.set(null);
    this.notice.set(null);
    this.isValidating.set(false);
    this.isDragOver.set(false);
    this.currentBroken.set(null);
    const input = this.fileInput().nativeElement;
    if (input) input.value = '';
  }

  protected browse(): void {
    if (this.isLocked()) return;
    this.fileInput().nativeElement.click();
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Clear so picking the same file again still fires `change`.
    input.value = '';
    if (file) void this.select(file);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.isLocked()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && (event.currentTarget as HTMLElement).contains(related)) return;
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (this.isLocked()) return;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    if (files.length > 1) {
      this.localError.set('يمكن رفع صورة واحدة فقط. اسحب ملفًا واحدًا.');
      return;
    }
    void this.select(files[0]);
  }

  protected discard(): void {
    if (this.isLocked()) return;
    this.reset();
    this.fileChange.emit(null);
  }

  protected onCurrentError(): void {
    this.currentBroken.set(this.currentUrl());
  }

  private async select(file: File): Promise<void> {
    const seq = ++this.selectionSeq;
    this.localError.set(null);
    this.notice.set(null);
    this.isValidating.set(true);

    const result = await prepareImageUpload(file);
    if (seq !== this.selectionSeq) return;
    this.isValidating.set(false);

    if (!result.ok) {
      this.localError.set(result.error);
      return;
    }

    this.revokePreview();
    this.pendingFile.set(result.file);
    this.pendingPreview.set(URL.createObjectURL(result.file));
    this.pendingMeta.set(`${result.width}×${result.height} · ${formatBytes(result.file.size)}`);
    if (result.normalized && result.file.name !== file.name) {
      this.notice.set(`تم تحويل الملف تلقائيًا إلى صيغة ${result.format === 'jpeg' ? 'JPG' : result.format.toUpperCase()} المتوافقة.`);
    }
    this.fileChange.emit(result.file);
  }

  private revokePreview(): void {
    const url = this.pendingPreview();
    if (url) URL.revokeObjectURL(url);
    this.pendingPreview.set(null);
  }
}
