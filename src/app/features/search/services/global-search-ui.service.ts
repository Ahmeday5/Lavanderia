import { Injectable, signal } from '@angular/core';

/**
 * Open/closed state of the global search palette, shared by its trigger (in
 * the topbar) and the palette itself (mounted once in the main layout, so its
 * overlay isn't trapped in the topbar's stacking context).
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchUiService {
  private readonly openState = signal(false);
  readonly isOpen = this.openState.asReadonly();

  open(): void {
    this.openState.set(true);
  }

  close(): void {
    this.openState.set(false);
  }

  toggle(): void {
    this.openState.update((open) => !open);
  }
}
