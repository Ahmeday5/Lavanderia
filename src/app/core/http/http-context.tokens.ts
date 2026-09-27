import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Per-request flags that interceptors honor.
 *
 * Use the `with*` builders below — never read these directly from feature code:
 *
 *   this.api.post(url, body, { context: withSkipLoader() });
 *   this.api.post(url, body, { context: withSilentErrors().set(SKIP_LOADER, true) });
 */

/** Don't toggle the global page loader for this request. */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

/** Don't attach the `Authorization: Bearer` header (e.g. login, refresh). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** Don't surface a toast on error — caller will handle the error inline. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Every GET is cached by default (see `core/http/cache-policy.ts`); set this
 * to `false` via `withNoCache()` for a request that must always hit the network.
 */
export const CACHEABLE = new HttpContextToken<boolean>(() => true);

/** Time-to-live override for a cached GET response, in ms. `null` = policy default. */
export const CACHE_TTL = new HttpContextToken<number | null>(() => null);

/**
 * Substring patterns of cached URLs to invalidate after a successful
 * mutating request. e.g. `['users']` clears every cached URL containing
 * `users`.
 */
export const CACHE_INVALIDATE = new HttpContextToken<readonly string[]>(() => []);

/** Force-bypass the cache for this GET (useful for explicit refresh buttons). */
export const CACHE_BYPASS = new HttpContextToken<boolean>(() => false);

/**
 * Per-request timeout override in ms (`null` = interceptor default). Needed
 * for uploads, where a large file on a slow link legitimately takes longer
 * than the default no-response cap.
 */
export const REQUEST_TIMEOUT = new HttpContextToken<number | null>(() => null);

export function withTimeout(ms: number, ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(REQUEST_TIMEOUT, ms);
}

export function withSkipLoader(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(SKIP_LOADER, true);
}

export function withSkipAuth(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(SKIP_AUTH, true);
}

export function withSilentErrors(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(SKIP_ERROR_TOAST, true);
}

/** Common combo for actions with their own button loader + inline error display. */
export function withInlineHandling(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(SKIP_LOADER, true).set(SKIP_ERROR_TOAST, true);
}

/**
 * Caching is already on for every GET — use this only to override the TTL.
 *
 *   { context: withCache({ ttlMs: 60_000 }) }     → 1 min TTL
 */
export function withCache(
  opts: { ttlMs?: number } = {},
  ctx: HttpContext = new HttpContext(),
): HttpContext {
  ctx.set(CACHEABLE, true);
  if (opts.ttlMs !== undefined) ctx.set(CACHE_TTL, opts.ttlMs);
  return ctx;
}

/** Always fetch this GET from the network and never store it. */
export function withNoCache(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(CACHEABLE, false);
}

/**
 * Extra patterns to evict after a successful mutation. The mutated URL's own
 * resource family is always evicted automatically — only pass patterns for
 * *other* resources the change affects.
 *
 *   { context: withCacheInvalidate(['users']) }
 */
export function withCacheInvalidate(
  patterns: readonly string[],
  ctx: HttpContext = new HttpContext(),
): HttpContext {
  return ctx.set(CACHE_INVALIDATE, patterns);
}

/** Skip the cache lookup for this GET (e.g. user-driven refresh). */
export function withCacheBypass(ctx: HttpContext = new HttpContext()): HttpContext {
  return ctx.set(CACHE_BYPASS, true);
}
