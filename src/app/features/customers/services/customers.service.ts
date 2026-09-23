import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PagedQuery } from '../../../core/models/api-response.model';
import { toPaged } from '../../../core/utils/api-list.util';
import { withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { Customer } from '../models/customer.model';

const ENDPOINT = 'dashboard/customers';

/** Mobile-app customer accounts — server-paginated, searchable by name or phone. */
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);

  list(query: PagedQuery) {
    const params = {
      search: query.search,
      PageIndex: query.pageIndex,
      PageSize: query.pageSize,
    };
    return this.api.get<unknown>(ENDPOINT, { params }).pipe(toPaged<Customer>());
  }

  ban(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/ban`, {}, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }

  unban(id: number) {
    return this.api.post<null>(`${ENDPOINT}/${id}/unban`, {}, {
      context: withInlineHandling(withCacheInvalidate([ENDPOINT])),
    });
  }
}
