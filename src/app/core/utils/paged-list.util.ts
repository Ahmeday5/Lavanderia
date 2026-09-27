import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { ApiError, PagedQuery, PagedResponse } from '../models/api-response.model';
import { PageRefreshService } from '../services/page-refresh.service';

export const DEFAULT_LIST_PAGE_SIZE = 10;
const DEFAULT_SEARCH_DEBOUNCE_MS = 400;

export interface PagedListOptions<T> {
  pageSize?: number;
  searchDebounceMs?: number;
  /** Load page 1 immediately on creation. Defaults to `true`. */
  immediate?: boolean;
  /** Called after every successfully applied page (e.g. to fetch per-row extras). */
  onPage?: (page: PagedResponse<T>) => void;
}

export interface PagedList<T> {
  readonly items: Signal<T[]>;
  readonly isLoading: Signal<boolean>;
  /** Last load failure, `null` when the current page loaded fine. */
  readonly error: Signal<ApiError | null>;
  readonly pageIndex: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly count: Signal<number>;
  readonly totalPages: Signal<number>;
  /** Raw text in the search box (updates on every keystroke). */
  readonly searchInput: Signal<string>;
  /** Committed (debounced) search term the current page was fetched with. */
  readonly search: Signal<string>;

  reload(): void;
  goToPage(page: number): void;
  setPageSize(size: number): void;
  setSearch(term: string): void;
  clearSearch(): void;
  /** Local, optimistic edit of the visible rows (no refetch). */
  updateItems(fn: (items: T[]) => T[]): void;
}

/**
 * Server-paginated list state for a page component — one place for the
 * paging/search/loading/error dance instead of re-implementing it per page.
 *
 *   protected readonly list = createPagedList((q) => this.citiesService.list(q));
 *
 * Guarantees:
 *   - stale responses are dropped (`switchMap`) — fast paging/typing can
 *     never render an older page over a newer one
 *   - a failed request never kills the stream; it lands in `error()` and the
 *     next `reload()` works normally
 *   - if the current page no longer exists (e.g. its last row was deleted)
 *     it steps back to the last real page automatically
 *   - refetches when the page's refresh button is pressed (`PageRefreshService`)
 *
 * Must be called in an injection context (field initializer / constructor).
 */
export function createPagedList<T>(
  fetchPage: (query: PagedQuery) => Observable<PagedResponse<T>>,
  options: PagedListOptions<T> = {},
): PagedList<T> {
  const destroyRef = inject(DestroyRef);

  const items = signal<T[]>([]);
  const isLoading = signal(true);
  const error = signal<ApiError | null>(null);
  const pageIndex = signal(1);
  const pageSize = signal(options.pageSize ?? DEFAULT_LIST_PAGE_SIZE);
  const count = signal(0);
  const totalPages = signal(0);
  const searchInput = signal('');
  const search = signal('');

  const load$ = new Subject<void>();
  const searchInput$ = new Subject<string>();

  load$
    .pipe(
      tap(() => {
        isLoading.set(true);
        error.set(null);
      }),
      switchMap(() =>
        fetchPage({
          pageIndex: pageIndex(),
          pageSize: pageSize(),
          search: search() || undefined,
        }).pipe(
          map((page) => ({ ok: true as const, page })),
          catchError((err: unknown) => of({ ok: false as const, err: toApiError(err) })),
        ),
      ),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((result) => {
      if (!result.ok) {
        error.set(result.err);
        isLoading.set(false);
        return;
      }

      const { page } = result;
      if (page.data.length === 0 && pageIndex() > 1 && pageIndex() > page.totalPages) {
        pageIndex.set(Math.max(1, page.totalPages));
        load$.next();
        return;
      }

      items.set(page.data);
      count.set(page.count);
      totalPages.set(page.totalPages);
      isLoading.set(false);
      options.onPage?.(page);
    });

  searchInput$
    .pipe(debounceTime(options.searchDebounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS), takeUntilDestroyed(destroyRef))
    .subscribe((term) => commitSearch(term));

  // The page's refresh button evicted this page's cache entries — refetch.
  inject(PageRefreshService)
    .refreshes$.pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => load$.next());

  function commitSearch(term: string): void {
    const trimmed = term.trim();
    if (trimmed === search()) return;
    search.set(trimmed);
    pageIndex.set(1);
    load$.next();
  }

  const list: PagedList<T> = {
    items: items.asReadonly(),
    isLoading: isLoading.asReadonly(),
    error: error.asReadonly(),
    pageIndex: pageIndex.asReadonly(),
    pageSize: pageSize.asReadonly(),
    count: count.asReadonly(),
    totalPages: totalPages.asReadonly(),
    searchInput: searchInput.asReadonly(),
    search: search.asReadonly(),

    reload: () => load$.next(),
    goToPage: (page) => {
      if (!Number.isFinite(page) || page < 1 || page === pageIndex()) return;
      pageIndex.set(page);
      load$.next();
    },
    setPageSize: (size) => {
      if (!Number.isFinite(size) || size <= 0 || size === pageSize()) return;
      pageSize.set(size);
      pageIndex.set(1);
      load$.next();
    },
    setSearch: (term) => {
      searchInput.set(term);
      searchInput$.next(term);
    },
    clearSearch: () => {
      searchInput.set('');
      commitSearch('');
    },
    updateItems: (fn) => items.update(fn),
  };

  if (options.immediate ?? true) list.reload();
  return list;
}

/** HTTP failures arrive pre-normalized by `errorInterceptor`; anything else (mapping bugs, …) is wrapped. */
function toApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    return err as ApiError;
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : 'حدث خطأ غير متوقع',
    raw: err,
  };
}
