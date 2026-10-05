import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { UPLOAD_TIMEOUT_MS, toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import {
  withCacheInvalidate,
  withInlineHandling,
  withTimeout,
} from '../../../core/http/http-context.tokens';
import {
  AdvertisementListFilter,
  CreateAdvertisementRequest,
  UpdateAdvertisementRequest,
  toAdvertisement,
} from '../models/advertisement.model';

const ENDPOINT = 'dashboard/advertisements';

/**
 * Advertisements — server-paginated, filterable by audience (`targetType`).
 *
 * Create/update are multipart (`Title`, `TargetType`, `Image`) in a single
 * request, so unlike services there is no separate image-upload step and no
 * partial-save state to recover from. Validate images with
 * `prepareImageUpload` (the image picker does) before sending.
 */
@Injectable({ providedIn: 'root' })
export class AdvertisementsService {
  private readonly api = inject(ApiService);

  list(filter: AdvertisementListFilter, query: PagedQuery = {}) {
    const params = {
      ...toPagedParams({ pageIndex: query.pageIndex, pageSize: query.pageSize }),
      targetType: filter.targetType ?? undefined,
    };
    return this.api
      .get<unknown>(ENDPOINT, { params })
      .pipe(toPaged(toAdvertisement));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toAdvertisement));
  }

  create(payload: CreateAdvertisementRequest) {
    return this.api
      .post<unknown>(ENDPOINT, toFormData(payload), { context: mutationContext() })
      .pipe(map(toAdvertisement));
  }

  update(id: number, payload: UpdateAdvertisementRequest) {
    return this.api
      .put<unknown>(`${ENDPOINT}/${id}`, toFormData(payload), { context: mutationContext() })
      .pipe(map(toAdvertisement));
  }

  delete(id: number) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}

/** Uploads may carry a multi-MB image, so they get the generous upload timeout. */
function mutationContext() {
  return withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling(withCacheInvalidate([ENDPOINT])));
}

/** Multipart body in the backend's field naming. `Image` is only sent when a new file was picked. */
function toFormData(payload: CreateAdvertisementRequest | UpdateAdvertisementRequest): FormData {
  const body = new FormData();
  body.append('Title', payload.title);
  body.append('TargetType', payload.targetType);
  if (payload.image) body.append('Image', payload.image, payload.image.name);
  return body;
}
