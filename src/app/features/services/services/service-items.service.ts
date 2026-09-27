import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import {
  UPLOAD_TIMEOUT_MS,
  fetchAllPages,
  toImageFormData,
  toPaged,
  toPagedParams,
} from '../../../core/utils/api-list.util';
import {
  withCacheInvalidate,
  withInlineHandling,
  withTimeout,
} from '../../../core/http/http-context.tokens';
import { toImageUploadResult } from '../models/service.model';
import {
  CreateServiceItemRequest,
  ServiceItem,
  UpdateServiceItemRequest,
  toServiceItem,
} from '../models/service-item.model';

const SERVICES_ENDPOINT = 'dashboard/services';
const ITEMS_ENDPOINT = 'dashboard/service-items';

/**
 * Service items are managed as a sub-resource of a service. Item mutations
 * invalidate `dashboard/services`, which also covers the cached
 * `dashboard/services/:id/items` pages.
 */
@Injectable({ providedIn: 'root' })
export class ServiceItemsService {
  private readonly api = inject(ApiService);

  /** Paged only — the endpoint has no server-side search. */
  listByService(serviceId: number, query: PagedQuery = {}) {
    return this.api
      .get<unknown>(`${SERVICES_ENDPOINT}/${serviceId}/items`, {
        params: toPagedParams({ pageIndex: query.pageIndex, pageSize: query.pageSize }),
      })
      .pipe(toPaged((raw) => toServiceItem(raw, serviceId)));
  }

  /** Every item of a service across all pages. */
  listAllByService(serviceId: number) {
    return fetchAllPages<ServiceItem>((pageIndex, pageSize) =>
      this.listByService(serviceId, { pageIndex, pageSize }),
    );
  }

  /** Total item count of a service, without downloading its rows. */
  countByService(serviceId: number) {
    return this.listByService(serviceId, { pageIndex: 1, pageSize: 1 }).pipe(
      map((page) => page.count),
    );
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ITEMS_ENDPOINT}/${id}`).pipe(map((raw) => toServiceItem(raw)));
  }

  create(payload: CreateServiceItemRequest) {
    return this.api
      .post<unknown>(ITEMS_ENDPOINT, payload, {
        context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
      })
      .pipe(map((raw) => toServiceItem(raw, payload.serviceId)));
  }

  update(id: number, payload: UpdateServiceItemRequest) {
    return this.api
      .put<unknown>(`${ITEMS_ENDPOINT}/${id}`, payload, {
        context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
      })
      .pipe(map((raw) => toServiceItem(raw, payload.serviceId)));
  }

  /** Validate the file first with `prepareImageUpload` — the backend is strict about formats. */
  uploadImage(id: number, file: File) {
    return this.api
      .post<unknown>(`${ITEMS_ENDPOINT}/${id}/image`, toImageFormData(file), {
        context: withTimeout(
          UPLOAD_TIMEOUT_MS,
          withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
        ),
      })
      .pipe(map(toImageUploadResult));
  }

  delete(id: number) {
    return this.api.delete<null>(`${ITEMS_ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([SERVICES_ENDPOINT])),
    });
  }
}
