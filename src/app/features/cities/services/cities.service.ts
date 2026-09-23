import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { City, CreateCityRequest, UpdateCityRequest } from '../models/city.model';

const ENDPOINT = 'dashboard/cities';

@Injectable({ providedIn: 'root' })
export class CitiesService {
  private readonly api = inject(ApiService);

  /** Backend returns the full list with no pagination/search support yet. */
  list() {
    return this.api.get<City[]>(ENDPOINT, { context: withCache() });
  }

  getById(id: number) {
    return this.api.get<City>(`${ENDPOINT}/${id}`);
  }

  create(payload: CreateCityRequest) {
    return this.api.post<City>(ENDPOINT, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  update(id: number, payload: UpdateCityRequest) {
    return this.api.put<City>(`${ENDPOINT}/${id}`, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  delete(id: number) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
