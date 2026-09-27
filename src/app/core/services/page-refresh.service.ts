import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HttpCacheService } from './http-cache.service';

/** Keeps the spinner visible long enough to read as "something happened". */
const MIN_REFRESH_MS = 600;

/**
 * Powers the per-page "refresh" button.
 *
 * `cacheInterceptor` reports every cacheable GET the current page performs
 * (hit or miss) via `track()`. `refresh()` then evicts exactly those cache
 * entries — nothing belonging to other pages — and signals `refreshes$`, which
 * page data sources (`createPagedList`, dashboards, …) listen to in order to
 * refetch. Since the entries are gone, those refetches hit the network and
 * repopulate the cache with fresh data.
 *
 * Tracking resets on every navigation, so "the page's endpoints" always means
 * the requests made since the current route started loading.
 */
@Injectable({ providedIn: 'root' })
export class PageRefreshService {
  private readonly cache = inject(HttpCacheService);

  /** cache key → when the data behind it was fetched from the server. */
  private readonly tracked = new Map<string, number>();
  private readonly trackedVersion = signal(0);
  private readonly inFlight = signal(0);
  private readonly refreshSubject = new Subject<void>();
  private refreshStartedAt = 0;

  readonly isRefreshing = signal(false);
  /** Any tracked GET currently loading (initial load, paging, refresh, …). */
  readonly isLoading = computed(() => this.inFlight() > 0);
  readonly refreshes$: Observable<void> = this.refreshSubject.asObservable();

  /** Age of the *oldest* data shown on the page — the honest "last updated". */
  readonly lastUpdated = computed<number | null>(() => {
    this.trackedVersion();
    let oldest: number | null = null;
    for (const at of this.tracked.values()) oldest = oldest === null ? at : Math.min(oldest, at);
    return oldest;
  });

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        this.tracked.clear();
        this.bump();
      });
  }

  track(key: string, fetchedAt: number): void {
    this.tracked.set(key, fetchedAt);
    this.bump();
  }

  requestStarted(): void {
    this.inFlight.update((n) => n + 1);
  }

  requestEnded(): void {
    this.inFlight.update((n) => Math.max(0, n - 1));
    this.maybeFinishRefresh();
  }

  refresh(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    this.refreshStartedAt = Date.now();

    this.cache.evictKeys([...this.tracked.keys()]);
    this.tracked.clear();
    this.bump();

    this.refreshSubject.next();
    // Listeners start their requests synchronously; if the page had none, finish anyway.
    setTimeout(() => this.maybeFinishRefresh());
  }

  private maybeFinishRefresh(): void {
    if (!this.isRefreshing() || this.inFlight() > 0) return;
    const remaining = MIN_REFRESH_MS - (Date.now() - this.refreshStartedAt);
    setTimeout(() => {
      if (this.inFlight() === 0) this.isRefreshing.set(false);
    }, Math.max(0, remaining));
  }

  private bump(): void {
    this.trackedVersion.update((v) => v + 1);
  }
}
