import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject, merge, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../models/api-response.model';

/** `idle` = nothing to load (no id, e.g. a "create" form). */
export type RecordStatus = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

export interface RecordLoaderOptions<T extends { id: number }> {
  /** Id to load, `null` for "nothing to load". Re-read reactively (route changes). */
  id: () => number | null;
  load: (id: number) => Observable<T>;
  /**
   * A copy already in hand (e.g. handed over by the form that just saved it,
   * see `readNavigationState`). Used instead of the first fetch when its id
   * matches; later reloads always hit the server.
   */
  seed?: T | null;
  /** Runs after every successful load (and `set`) — e.g. to fill a form. */
  onLoaded?: (value: T) => void;
}

export interface RecordLoader<T> {
  readonly status: Signal<RecordStatus>;
  readonly value: Signal<T | null>;
  /** Last failure when `status` is `error`. */
  readonly error: Signal<ApiError | null>;
  readonly isReady: Signal<boolean>;
  reload(): void;
  /** Replaces the loaded copy locally (e.g. with a mutation's response) — no refetch. */
  set(value: T): void;
}

/**
 * Load state for a single record addressed by an id — the details and edit
 * pages' counterpart of `createPagedList`.
 *
 * Guarantees:
 *   - a superseded load (id change, double retry) never overwrites a newer one
 *   - 404 lands in `not-found`, anything else in `error`; neither kills reloads
 *
 * Must be called in an injection context.
 */
export function createRecordLoader<T extends { id: number }>(
  opts: RecordLoaderOptions<T>,
): RecordLoader<T> {
  const destroyRef = inject(DestroyRef);

  const status = signal<RecordStatus>('idle');
  const value = signal<T | null>(null);
  const error = signal<ApiError | null>(null);
  let seed = opts.seed ?? null;

  const id = computed(opts.id);
  const reload$ = new Subject<void>();

  merge(toObservable(id), reload$.pipe(map(() => id())))
    .pipe(
      tap((current) => {
        error.set(null);
        if (current === null) {
          value.set(null);
          status.set('idle');
        } else {
          // A reload keeps the current copy on screen; another record must not.
          if (value()?.id !== current) value.set(null);
          status.set('loading');
        }
      }),
      switchMap((current) => {
        if (current === null) return of(null);
        const handedOver = seed?.id === current ? seed : null;
        seed = null;
        const source$ = handedOver ? of(handedOver) : opts.load(current);
        return source$.pipe(
          map((record) => ({ ok: true as const, record })),
          catchError((err: ApiError) => of({ ok: false as const, err })),
        );
      }),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((result) => {
      if (result === null) return;
      if (!result.ok) {
        error.set(result.err);
        status.set(result.err?.status === 404 ? 'not-found' : 'error');
        return;
      }
      apply(result.record);
    });

  function apply(record: T): void {
    value.set(record);
    status.set('ready');
    opts.onLoaded?.(record);
  }

  return {
    status: status.asReadonly(),
    value: value.asReadonly(),
    error: error.asReadonly(),
    isReady: computed(() => status() === 'ready'),
    reload: () => reload$.next(),
    set: apply,
  };
}

/** Parses a positive integer route id (`"42"` → 42); anything else → `null`. */
export function parseRouteId(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
