import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError, ApiResult } from '../../../core/models/api-response.model';
import { ConfirmDialogConfig, DialogService } from '../../../core/services/dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface AccountActionSpec<T> {
  confirm: ConfirmDialogConfig;
  request: () => Observable<ApiResult<T>>;
  /** Toast copy when the server sends no `message`. */
  successFallback: string;
  /** Toast copy when the error carries no usable message. */
  errorFallback: string;
  /** Toggled around the request only (not while the dialog is open) — drive a button spinner. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * The one flow behind every account action button (ban, unban, activate,
 * deactivate, delete), wherever it sits — list row or details page:
 *
 *   confirm → request → toast the server's `message` (success or error).
 *
 * Resolves with the response data on success, `null` when the admin
 * cancelled or the server refused, so callers only patch their own view.
 */
@Injectable({ providedIn: 'root' })
export class AccountActionRunner {
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  async run<T>(spec: AccountActionSpec<T>): Promise<{ data: T } | null> {
    const confirmed = await this.dialog.confirm(spec.confirm);
    if (!confirmed) return null;

    spec.onBusyChange?.(true);
    return new Promise((resolve) => {
      spec.request().subscribe({
        next: (result) => {
          spec.onBusyChange?.(false);
          this.toast.success(result.message ?? spec.successFallback);
          resolve({ data: result.data });
        },
        error: (err: ApiError) => {
          spec.onBusyChange?.(false);
          this.toast.error(apiErrorToMessage(err, spec.errorFallback));
          resolve(null);
        },
      });
    });
  }
}
