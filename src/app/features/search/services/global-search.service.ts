import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { toLatinDigits } from '../../../core/utils/local-search.util';
import {
  withNoCache,
  withSilentErrors,
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  toGlobalSearchResult,
} from '../models/global-search.model';

const ENDPOINT = 'dashboard/search';

/**
 * `GET dashboard/search?q=&limit=` — one query across accounts, orders,
 * cities, services and service items.
 *
 * Never cached (results must reflect the latest data, and each keystroke is a
 * new key anyway), no global loader (the palette shows its own), no global
 * error toast (the palette reports inline). Callers must not send a blank `q`
 * — the server answers 400. Unsubscribing aborts the HTTP request, so a
 * `switchMap` caller cancels stale searches for free.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly api = inject(ApiService);

  search(query: string, limit = SEARCH_DEFAULT_LIMIT) {
    return this.api
      .get<unknown>(ENDPOINT, {
        params: {
          q: toLatinDigits(query.trim()),
          limit: Math.min(Math.max(1, limit), SEARCH_MAX_LIMIT),
        },
        context: withNoCache(withSkipLoader(withSilentErrors())),
      })
      .pipe(map(toGlobalSearchResult));
  }
}
