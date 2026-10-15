import { DestroyRef, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { PagedList } from './paged-list.util';

/** Query-string key list pages keep their search term under (`/laundries?search=…`). */
export const SEARCH_QUERY_PARAM = 'search';

/**
 * Two-way binding between a paged list's committed search and the URL's
 * `?search=` — so a searched view survives a reload, can be shared, and can be
 * opened from elsewhere (the global search's "عرض الكل" links).
 *
 *   protected readonly list = createPagedList(fetch, { immediate: false });
 *   constructor() { bindListSearchToUrl(this.list); }
 *
 * Create the list with `immediate: false`: the URL drives the first load, so
 * a deep link never fetches the unfiltered page first. URL updates use
 * `replaceUrl`, keeping keystrokes out of the browser history.
 *
 * Must be called in an injection context.
 */
export function bindListSearchToUrl(list: PagedList<unknown>, param = SEARCH_QUERY_PARAM): void {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  // URL → list (also the initial load: `queryParamMap` replays its current value).
  route.queryParamMap
    .pipe(
      map((params) => params.get(param)?.trim() ?? ''),
      distinctUntilChanged(),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((term) => list.applySearch(term));

  // list → URL, once a typed search is committed (debounced by the list).
  effect(() => {
    const term = list.search();
    untracked(() => {
      const current = route.snapshot.queryParamMap.get(param)?.trim() ?? '';
      if (current === term) return;
      void router.navigate([], {
        relativeTo: route,
        queryParams: { [param]: term || null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
