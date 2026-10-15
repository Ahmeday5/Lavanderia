import { Injectable, inject } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import { withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { City, CreateCityRequest, UpdateCityRequest, toCity } from '../models/city.model';
import { CityLookupService } from './city-lookup.service';

const ENDPOINT = 'dashboard/cities';

/**
 * Cities — server-paginated. The endpoint has no server-side search; pages
 * that need one filter locally (see `withLocalSearch`).
 */
@Injectable({ providedIn: 'root' })
export class CitiesService {
  private readonly api = inject(ApiService);
  /** Account forms pick cities from the lookup — refresh it after any change here. */
  private readonly lookup = inject(CityLookupService);

  list(query: PagedQuery = {}) {
    const params = toPagedParams({ pageIndex: query.pageIndex, pageSize: query.pageSize });
    return this.api
      .get<unknown>(ENDPOINT, { params })
      .pipe(toPaged(toCity));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toCity));
  }

  create(payload: CreateCityRequest) {  
    return this.api
      .post<unknown>(ENDPOINT, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(
        map(toCity),
        tap(() => this.lookup.invalidate()),
      );
  }

  update(id: number, payload: UpdateCityRequest) {
    return this.api
      .put<unknown>(`${ENDPOINT}/${id}`, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(
        map(toCity),
        tap(() => this.lookup.invalidate()),
      );
  }

  delete(id: number) {
    return this.api
      .delete<null>(`${ENDPOINT}/${id}`, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(tap(() => this.lookup.invalidate()));
  }
}
