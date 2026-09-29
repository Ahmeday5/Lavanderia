import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../models/api-response.model';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface EditableResourceOptions<T> {
  load: () => Observable<T>;
  save: (value: T) => Observable<T>;
  /** Runs with the server copy after every successful load *and* save — sync the form here. */
  onSynced: (value: T) => void;
}

export interface EditableResource<T> {
  readonly status: Signal<LoadStatus>;
  /** Last load failure, `null` while loading or once loaded. */
  readonly loadError: Signal<ApiError | null>;
  /** The last copy confirmed by the server — the baseline for "unsaved changes". */
  readonly saved: Signal<T | null>;
  readonly isSaving: Signal<boolean>;
  /** Last save failure, cleared when a new save starts. */
  readonly saveError: Signal<ApiError | null>;

  reload(): void;
  /** Resolves `true` when the server accepted the value. Ignored while a save is in flight. */
  save(value: T): Promise<boolean>;
  clearSaveError(): void;
}

/**
 * State for a singleton "settings record" edited in a form (contact details,
 * privacy policy, …) — the load / edit / save lifecycle in one place.
 *
 *   protected readonly resource = createEditableResource({
 *     load: () => this.service.get(),
 *     save: (value) => this.service.update(value),
 *     onSynced: (value) => this.form.reset(value),
 *   });
 *
 * Guarantees:
 *   - a superseded load (e.g. double "retry") never overwrites a newer one
 *   - the baseline only moves on server confirmation, using the server's
 *     response (it may normalize what was sent)
 *   - saves can't overlap
 *
 * Must be called in an injection context (field initializer / constructor).
 */
export function createEditableResource<T>(opts: EditableResourceOptions<T>): EditableResource<T> {
  const destroyRef = inject(DestroyRef);

  const status = signal<LoadStatus>('loading');
  const loadError = signal<ApiError | null>(null);
  const saved = signal<T | null>(null);
  const isSaving = signal(false);
  const saveError = signal<ApiError | null>(null);

  const sync = (value: T) => {
    saved.set(value);
    opts.onSynced(value);
  };

  const load$ = new Subject<void>();
  load$
    .pipe(
      tap(() => {
        status.set('loading');
        loadError.set(null);
      }),
      switchMap(() =>
        opts.load().pipe(
          map((value) => ({ value, error: null })),
          catchError((error: ApiError) => of({ value: null, error })),
        ),
      ),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(({ value, error }) => {
      if (error || value === null) {
        loadError.set(error);
        status.set('error');
        return;
      }
      sync(value);
      status.set('ready');
    });

  const save = (value: T): Promise<boolean> => {
    if (isSaving()) return Promise.resolve(false);
    isSaving.set(true);
    saveError.set(null);

    return new Promise<boolean>((resolve) => {
      opts
        .save(value)
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe({
          next: (result) => {
            isSaving.set(false);
            sync(result);
            resolve(true);
          },
          error: (error: ApiError) => {
            isSaving.set(false);
            saveError.set(error);
            resolve(false);
          },
        });
    });
  };

  load$.next();

  return {
    status: status.asReadonly(),
    loadError: loadError.asReadonly(),
    saved: saved.asReadonly(),
    isSaving: isSaving.asReadonly(),
    saveError: saveError.asReadonly(),
    reload: () => load$.next(),
    save,
    clearSaveError: () => saveError.set(null),
  };
}
