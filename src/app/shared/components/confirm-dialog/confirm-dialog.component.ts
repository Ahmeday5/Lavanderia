import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';
import { ModalComponent } from '../modal/modal.component';

const TYPE_CLASSES = {
  danger: { icon: 'cd-icon-danger', confirm: 'cd-btn-danger', glyph: 'fa-trash-can' },
  warning: { icon: 'cd-icon-warning', confirm: 'cd-btn-warning', glyph: 'fa-triangle-exclamation' },
  info: { icon: 'cd-icon-info', confirm: 'cd-btn-info', glyph: 'fa-circle-info' },
} as const;

/** Mount once near the app root (e.g. in the main layout) alongside `DialogService`. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(DialogService);

  protected readonly state = this.dialog.state;
  protected readonly isOpen = computed(() => this.state().isOpen);
  protected readonly config = computed(() => this.state().config);

  protected readonly iconClass = computed(
    () => TYPE_CLASSES[this.config().type ?? 'danger'].icon,
  );
  protected readonly iconGlyph = computed(
    () => TYPE_CLASSES[this.config().type ?? 'danger'].glyph,
  );
  protected readonly confirmBtnClass = computed(
    () => TYPE_CLASSES[this.config().type ?? 'danger'].confirm,
  );

  confirm(): void {
    this.dialog.handleResponse(true);
  }

  cancel(): void {
    this.dialog.handleResponse(false);
  }
}
