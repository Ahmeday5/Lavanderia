import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import { withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { AppUser, CreateAppUserRequest, UpdateAppUserRequest, toAppUser } from '../models/app-user.model';

const ENDPOINT = 'dashboard/app-users';

/**
 * Manages the users who have access to this admin dashboard — server-paginated.
 * The endpoint has no server-side search; pages filter locally (see `withLocalSearch`).
 */
@Injectable({ providedIn: 'root' })
export class AppUsersService {
  private readonly api = inject(ApiService);

  list(query: PagedQuery = {}) {
    const params = toPagedParams({ pageIndex: query.pageIndex, pageSize: query.pageSize });
    return this.api
      .get<unknown>(ENDPOINT, { params })
      .pipe(toPaged(toAppUser));
  }

  getById(id: string) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toAppUser));
  }

  create(payload: CreateAppUserRequest) {
    return this.api
      .post<unknown>(ENDPOINT, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(map(toAppUser));
  }

  update(id: string, payload: UpdateAppUserRequest) {
    return this.api
      .put<unknown>(`${ENDPOINT}/${id}`, payload, {
        context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
      })
      .pipe(map(toAppUser));
  }

  delete(id: string) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
