import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { AppUser, CreateAppUserRequest, UpdateAppUserRequest } from '../models/app-user.model';

const ENDPOINT = 'dashboard/app-users';

/** Manages the users who have access to this admin dashboard. */
@Injectable({ providedIn: 'root' })
export class AppUsersService {
  private readonly api = inject(ApiService);

  /** Backend returns the full list with no pagination/search support yet. */
  list() {
    return this.api.get<AppUser[]>(ENDPOINT, { context: withCache() });
  }

  getById(id: string) {
    return this.api.get<AppUser>(`${ENDPOINT}/${id}`);
  }

  create(payload: CreateAppUserRequest) {
    return this.api.post<AppUser>(ENDPOINT, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  update(id: string, payload: UpdateAppUserRequest) {
    return this.api.put<AppUser>(`${ENDPOINT}/${id}`, payload, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  delete(id: string) {
    return this.api.delete<null>(`${ENDPOINT}/${id}`, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
