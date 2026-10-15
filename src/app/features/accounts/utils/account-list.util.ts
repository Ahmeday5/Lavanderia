import { DestroyRef, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { skip } from 'rxjs/operators';
import { PagedResponse } from '../../../core/models/api-response.model';
import { PagedList, createPagedList } from '../../../core/utils/paged-list.util';
import { bindListSearchToUrl } from '../../../core/utils/url-search-sync.util';
import { AccountListQuery } from '../models/account.model';

export interface AccountList<T> {
  readonly list: PagedList<T>;
  /** "عرض المحذوفين" — toggling it reloads from page 1. */
  readonly includeDeleted: WritableSignal<boolean>;
}

/**
 * List state shared by the laundries / customers / drivers pages: server
 * search kept in `?search=` (deep-linkable from the global search), the
 * soft-deleted visibility toggle, and server pagination.
 *
 *   protected readonly accounts = createAccountList((q) => this.service.list(q));
 *
 * Must be called in an injection context.
 */
export function createAccountList<T>(
  fetchPage: (query: AccountListQuery) => Observable<PagedResponse<T>>,
): AccountList<T> {
  const includeDeleted = signal(false);
  const list = createPagedList<T>(
    (query) => fetchPage({ ...query, includeDeleted: includeDeleted() }),
    { immediate: false },
  );

  // The URL drives the first load (see `bindListSearchToUrl`).
  bindListSearchToUrl(list);

  toObservable(includeDeleted)
    .pipe(skip(1), takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(() => list.restart());

  return { list, includeDeleted };
}
