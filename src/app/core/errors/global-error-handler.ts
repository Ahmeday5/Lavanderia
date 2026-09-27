import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

const TOAST_THROTTLE_MS = 5000;

/**
 * App-wide handler for errors nothing else caught (template/runtime errors,
 * rejected promises inside the zone, …).
 *
 * Angular's default handler only logs to the console, so a render error looks
 * to the user like the page silently died. This keeps the console trace and
 * also tells the user something went wrong, throttled so an error thrown on
 * every change-detection pass can't flood the toast stack.
 *
 * HTTP failures are skipped — `errorInterceptor` already toasts those.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Resolved lazily: ErrorHandler is created before most of the app, and a
  // failure during bootstrap must still be loggable.
  private readonly injector = inject(Injector);
  private lastToastAt = 0;

  handleError(error: unknown): void {
    console.error('[Unhandled error]', error);

    if (isHandledHttpError(error)) return;

    const now = Date.now();
    if (now - this.lastToastAt < TOAST_THROTTLE_MS) return;
    this.lastToastAt = now;

    // Defer: this may run mid change-detection, where writing the toast
    // signal synchronously would re-enter the failing render.
    setTimeout(() => {
      try {
        this.injector
          .get(ToastService)
          .error('حدث خطأ غير متوقع أثناء عرض هذه الصفحة. إذا تكرر، يرجى تحديث الصفحة.');
      } catch {
        /* toast infrastructure unavailable — console log above is enough */
      }
    });
  }
}

/** `ApiError` objects produced by `errorInterceptor` (plain objects with a numeric `status`). */
function isHandledHttpError(error: unknown): boolean {
  const e = (error as { rejection?: unknown })?.rejection ?? error;
  return (
    !!e &&
    typeof e === 'object' &&
    !(e instanceof Error) &&
    typeof (e as { status?: unknown }).status === 'number' &&
    typeof (e as { message?: unknown }).message === 'string'
  );
}
