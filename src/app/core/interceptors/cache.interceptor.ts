import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize, of, share, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from '../services/http-cache.service';
import { PageRefreshService } from '../services/page-refresh.service';
import { CACHEABLE, CACHE_BYPASS, CACHE_INVALIDATE, CACHE_TTL } from '../http/http-context.tokens';
import {
  invalidationPatternsFor,
  isCacheable,
  isUncertainOutcome,
  ttlFor,
} from '../http/cache-policy';

const API_BASE_PATH = basePath(environment.apiUrl);

/**
 * HTTP caching layer — policy lives in `core/http/cache-policy.ts`.
 *
 *   GET      → fresh cache hit: answered from memory, no network
 *            → identical request already in flight: shares it (one network call)
 *            → otherwise: fetched, then stored — unless a mutation evicted the
 *              cache while it was in flight (epoch check), so a read that raced
 *              a write can never resurrect pre-write data
 *   mutation → on success, evicts the URL's resource family + related and
 *              explicit patterns. Also on 5xx/network failure, where the
 *              server may have applied the change before failing.
 *
 * Every cacheable GET is reported to `PageRefreshService` so the page's
 * refresh button knows exactly which entries to evict.
 *
 * Place FIRST in the interceptor chain so hits skip loader/auth/error work.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCacheService);
  const pageRefresh = inject(PageRefreshService);
  const key = cacheKey(req.urlWithParams);

  if (req.method === 'GET') {
    if (!req.context.get(CACHEABLE) || !isCacheable(key)) return next(req);

    if (!req.context.get(CACHE_BYPASS)) {
      const entry = cache.getEntry<unknown>(key);
      if (entry) {
        pageRefresh.track(key, entry.cachedAt);
        return of(new HttpResponse({ body: entry.data, status: 200, url: req.urlWithParams }));
      }
      const pending = cache.inflight.get(key);
      if (pending) return pending;
    }

    const epoch = cache.epoch;
    const ttl = ttlFor(key, req.context.get(CACHE_TTL));
    pageRefresh.requestStarted();

    const request$: Observable<HttpEvent<unknown>> = next(req).pipe(
      tap((event) => {
        if (!(event instanceof HttpResponse) || event.status < 200 || event.status >= 300) return;
        if (cache.epoch === epoch) cache.set(key, event.body, ttl);
        pageRefresh.track(key, Date.now());
      }),
      finalize(() => {
        if (cache.inflight.get(key) === request$) cache.inflight.delete(key);
        pageRefresh.requestEnded();
      }),
      share(),
    );
    cache.inflight.set(key, request$);
    return request$;
  }

  if (isMutation(req.method)) {
    const patterns = invalidationPatternsFor(key, API_BASE_PATH, req.context.get(CACHE_INVALIDATE));
    if (!patterns.length) return next(req);

    return next(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
            cache.invalidateMany(patterns);
          }
        },
        // `errorInterceptor` runs inside this one, so failures usually arrive
        // as a normalized `ApiError` rather than an `HttpErrorResponse` —
        // both carry a numeric `status`.
        error: (err: unknown) => {
          const status = (err as { status?: unknown } | null)?.status;
          if (typeof status === 'number' && isUncertainOutcome(status)) {
            cache.invalidateMany(patterns);
          }
        },
      }),
    );
  }

  return next(req);
};

function isMutation(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

/** Strip the protocol/host so cached entries are reusable across env URLs. */
function cacheKey(urlWithParams: string): string {
  try {
    if (urlWithParams.startsWith('http')) {
      const u = new URL(urlWithParams);
      return u.pathname + u.search;
    }
  } catch {
    /* fall through */
  }
  return urlWithParams;
}

/** Path part of the API base URL (`https://host/api/` → `/api`). */
function basePath(apiUrl: string): string {
  try {
    const path = apiUrl.startsWith('http') ? new URL(apiUrl).pathname : apiUrl;
    return path.replace(/\/+$/, '');
  } catch {
    return '';
  }
}
