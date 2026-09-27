import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged, toPagedParams } from '../../../core/utils/api-list.util';
import { toLatinDigits } from '../../../core/utils/local-search.util';
import { withInlineHandling } from '../../../core/http/http-context.tokens';
import { toCustomer } from '../models/customer.model';

const ENDPOINT = 'dashboard/customers';

/**
 * Mobile-app customer accounts — server-paginated, searchable by name or phone.
 * Cached per the central policy; ban/unban evict it automatically.
 */
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);

  list(query: PagedQuery = {}) {
    const params = toPagedParams({
      ...query,
      search: query.search ? toLatinDigits(query.search) : undefined,
    });
    return this.api.get<unknown>(ENDPOINT, { params }).pipe(toPaged(toCustomer));
  }

  ban(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/ban`, {}, { context: withInlineHandling() });
  }

  unban(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/unban`, {}, { context: withInlineHandling() });
  }
}
