import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { Service, CreateServiceRequest, UpdateServiceRequest } from '../models/service.model';

const ENDPOINT = 'dashboard/services';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private readonly api = inject(ApiService);

  /** Backend returns the full list with no pagination/search support yet. */
  list() {
    return this.api.get<Service[]>(ENDPOINT, { context: withCache() });
  }

  /** Includes the service's nested `items` array. */
  getById(id: number) {
    return this.api.get<Service>(`${ENDPOINT}/${id}`);
  }

  create(payload: CreateServiceRequest) {
    return this.api.post<Service>(ENDPOINT, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  update(id: number, payload: UpdateServiceRequest) {
    return this.api.put<Service>(`${ENDPOINT}/${id}`, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  delete(id: number) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
