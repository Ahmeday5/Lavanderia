/**
 * Central HTTP cache policy — the one file to edit when caching rules change.
 *
 * Model:
 *   - every GET is cached by default (opt out per request with `withNoCache()`)
 *   - every successful mutation (POST/PUT/PATCH/DELETE) automatically evicts
 *     its whole resource family, derived from the URL — so a new endpoint
 *     can't "forget" to invalidate. Explicit `withCacheInvalidate([...])`
 *     patterns and `RELATED_RESOURCES` add cross-resource invalidation on top.
 *   - entries live in memory; only `PERSISTABLE` (non-personal reference
 *     data) is mirrored to localStorage
 */

/** Default freshness window for cached GETs. */
export const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Never cached, whatever the request context says. Identity/session data must
 * always come from the server — a stale `auth/me` could grant a revoked role.
 */
export const NEVER_CACHE: readonly string[] = ['auth/'];

/**
 * The ONLY cache entries also written to localStorage (survive reloads/new
 * tabs). Everything else is memory-only and gone when the tab closes.
 *
 * Allowlist, not blocklist: a new endpoint is private by default. Only add
 * non-personal reference data here — never anything with names, phones,
 * emails or account state, which would otherwise sit on disk, readable by
 * the next user of a shared machine or by any injected script.
 * (`dashboard/services` also covers `dashboard/services/:id/items`.)
 */
export const PERSISTABLE: readonly string[] = ['dashboard/cities', 'dashboard/services'];

export function isPersistable(cacheKey: string): boolean {
  return PERSISTABLE.some((fragment) => cacheKey.includes(fragment));
}

/**
 * Shorter TTLs for data that changes *outside* this dashboard (drivers going
 * on/offline, customers & laundries registering from the apps). Mutations made
 * here still invalidate immediately; this only bounds staleness from outside.
 * First match wins.
 */
export const TTL_OVERRIDES: readonly { match: string; ttlMs: number }[] = [
  { match: 'dashboard/drivers', ttlMs: 60 * 1000 },
  { match: 'dashboard/customers', ttlMs: 2 * 60 * 1000 },
  { match: 'dashboard/laundries', ttlMs: 2 * 60 * 1000 },
];

/**
 * Resource families whose mutation also affects another family's cached GETs.
 * e.g. an item change alters `GET dashboard/services/:id/items` (counts, lists).
 */
export const RELATED_RESOURCES: Readonly<Record<string, readonly string[]>> = {
  'dashboard/service-items': ['dashboard/services'],
};

/** Mutation outcomes after which the server state is unknown — evict to be safe. */
export function isUncertainOutcome(status: number): boolean {
  return status === 0 || status >= 500;
}

export function ttlFor(cacheKey: string, requested: number | null): number {
  if (requested !== null) return requested;
  return TTL_OVERRIDES.find((o) => cacheKey.includes(o.match))?.ttlMs ?? DEFAULT_CACHE_TTL_MS;
}

export function isCacheable(cacheKey: string): boolean {
  return !NEVER_CACHE.some((fragment) => cacheKey.includes(fragment));
}

const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Resource family of a request path, relative to the API root:
 *
 *   /api/dashboard/drivers/1/activate      → dashboard/drivers
 *   /api/dashboard/service-items/93/image  → dashboard/service-items
 *   /api/dashboard/app-users/2b96…-f0      → dashboard/app-users
 *
 * = the leading segments up to the first id-like one, capped at two.
 */
export function resourceFamily(path: string, apiBasePath: string): string {
  const clean = path.split('?')[0];
  const relative = apiBasePath && clean.startsWith(apiBasePath) ? clean.slice(apiBasePath.length) : clean;
  const segments = relative.split('/').filter(Boolean);
  const family: string[] = [];
  for (const segment of segments) {
    if (ID_SEGMENT.test(segment) || family.length === 2) break;
    family.push(segment);
  }
  return family.join('/');
}

/** Every cache pattern a mutation on `path` must evict. */
export function invalidationPatternsFor(
  path: string,
  apiBasePath: string,
  explicit: readonly string[],
): string[] {
  const family = resourceFamily(path, apiBasePath);
  const patterns = new Set<string>(explicit);
  if (family) {
    patterns.add(family);
    for (const related of RELATED_RESOURCES[family] ?? []) patterns.add(related);
  }
  return [...patterns].filter(Boolean);
}
