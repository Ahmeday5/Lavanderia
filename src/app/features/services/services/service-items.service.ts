import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import {
  CreateServiceItemRequest,
  ServiceItem,
  UpdateServiceItemRequest,
} from '../models/service-item.model';

const SERVICES_ENDPOINT = 'dashboard/services';
const ITEMS_ENDPOINT = 'dashboard/service-items';

/** Service items are managed as a sub-resource of a service. */
@Injectable({ providedIn: 'root' })
export class ServiceItemsService {
  private readonly api = inject(ApiService);

  listByService(serviceId: number) {
    return this.api.get<ServiceItem[]>(`${SERVICES_ENDPOINT}/${serviceId}/items`);
  }

  getById(id: number) {
    return this.api.get<ServiceItem>(`${ITEMS_ENDPOINT}/${id}`);
  }

  create(payload: CreateServiceItemRequest) {
    return this.api.post<ServiceItem>(ITEMS_ENDPOINT, payload, {
      context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
    });
  }

  update(id: number, payload: UpdateServiceItemRequest) {
    return this.api.put<ServiceItem>(`${ITEMS_ENDPOINT}/${id}`, payload, {
      context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
    });
  }

  delete(id: number) {
    return this.api.delete<null>(`${ITEMS_ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
    });
  }
}
