import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import { toLatinDigits } from '../../../core/utils/local-search.util';
import { withInlineHandling } from '../../../core/http/http-context.tokens';
import { toDriver } from '../models/driver.model';

const ENDPOINT = 'dashboard/drivers';

/**
 * Delivery drivers — server-paginated with server-side search (name or phone).
 * Cached with a short TTL (availability changes from the driver app, see
 * `cache-policy.ts`); activate/deactivate evict it automatically.
 */
@Injectable({ providedIn: 'root' })
export class DriversService {
  private readonly api = inject(ApiService);

  list(query: PagedQuery = {}) {
    const params = toPagedParams({
      ...query,
      // Phones are stored with Latin digits; users often type Arabic-Indic ones.
      search: query.search ? toLatinDigits(query.search) : undefined,
    });
    return this.api.get<unknown>(ENDPOINT, { params }).pipe(toPaged(toDriver));
  }

  activate(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/activate`, {}, { context: withInlineHandling() });
  }

  deactivate(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/deactivate`, {}, { context: withInlineHandling() });
  }
}
