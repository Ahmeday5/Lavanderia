import { Injectable, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { asList } from '../../../core/utils/api-list.util';
import { withSilentErrors, withSkipLoader } from '../../../core/http/http-context.tokens';
import { SearchableSelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { City, toCity } from '../models/city.model';

const ENDPOINT = 'auth/cities';

/**
 * Every city as `{ id, name }` for pickers — the public, unpaginated
 * `auth/cities` endpoint. `auth/*` is excluded from the HTTP cache by policy,
 * so the list is memoized here for the session: it is small reference data.
 *
 *   protected readonly cities = inject(CityLookupService);
 *   constructor() { this.cities.ensureLoaded(); }
 *   <app-searchable-select [options]="cities.options()" [isDisabled]="cities.isLoading()" />
 */
@Injectable({ providedIn: 'root' })
export class CityLookupService {
  private readonly api = inject(ApiService);

  private readonly cities = signal<City[] | null>(null);
  private readonly loading = signal(false);
  private readonly failed = signal(false);

  readonly isLoading = this.loading.asReadonly();
  readonly hasFailed = this.failed.asReadonly();
  readonly options = computed<SearchableSelectOption[]>(() =>
    (this.cities() ?? []).map((city) => ({ value: city.id, label: city.name })),
  );

  /** Loads once per session; concurrent calls share one request, a failure is retried on the next call. */
  ensureLoaded(): void {
    if (this.cities() !== null || this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);

    this.api
      .get<unknown>(ENDPOINT, { context: withSkipLoader(withSilentErrors()) })
      .pipe(map((raw) => asList<unknown>(raw).map(toCity).filter((city) => city.id > 0)))
      .subscribe({
        next: (cities) => {
          this.cities.set(cities);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Forces a refetch on the next `ensureLoaded()` (after a city is added, renamed or removed). */
  invalidate(): void {
    this.cities.set(null);
  }
}
