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
import {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  toImageUploadResult,
  toService,
} from '../models/service.model';

const ENDPOINT = 'dashboard/services';

/**
 * Laundry services — server-paginated. The endpoint has no server-side
 * search; pages that need one filter locally (see `withLocalSearch`).
 */
@Injectable({ providedIn: 'root' })
export class ServicesService {
  private readonly api = inject(ApiService);

  list(query: PagedQuery = {}) {
    const params = toPagedParams({ pageIndex: query.pageIndex, pageSize: query.pageSize });
    return this.api
      .get<unknown>(ENDPOINT, { params })
      .pipe(toPaged(toService));
  }

  /** Every service across all pages — for pickers/selects, not for list pages. */
  listAll() {
    return fetchAllPages<Service>((pageIndex, pageSize) => this.list({ pageIndex, pageSize }));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toService));
  }

  create(payload: CreateServiceRequest) {
    return this.api
      .post<unknown>(ENDPOINT, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(map(toService));
  }

  update(id: number, payload: UpdateServiceRequest) {
    return this.api
      .put<unknown>(`${ENDPOINT}/${id}`, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(map(toService));
  }

  /** Validate the file first with `prepareImageUpload` — the backend is strict about formats. */
  uploadImage(id: number, file: File) {
    return this.api
      .post<unknown>(`${ENDPOINT}/${id}/image`, toImageFormData(file), {
        context: withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling(withCacheInvalidate([ENDPOINT]))),
      })
      .pipe(map(toImageUploadResult));
  }

  delete(id: number) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
