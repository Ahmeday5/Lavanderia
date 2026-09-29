import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { DialogService } from '../services/dialog.service';

/** Implemented by pages holding edits that navigation would silently discard. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Asks before leaving a page with unsaved edits.
 *
 *   { path: 'x', component: X, canDeactivate: [unsavedChangesGuard] }
 *
 * Covers in-app navigation only; reloads/tab closes are the page's job
 * (`window:beforeunload`), since browsers only allow their own native prompt.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component?.hasUnsavedChanges()) return true;

  return inject(DialogService).confirm({
    title: 'تغييرات غير محفوظة',
    message: 'لديك تعديلات لم يتم حفظها بعد. هل تريد مغادرة الصفحة وتجاهلها؟',
    confirmText: 'مغادرة دون حفظ',
    cancelText: 'البقاء في الصفحة',
    type: 'warning',
  });
};
