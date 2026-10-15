import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResult } from '../../../core/models/api-response.model';
import { toPaged } from '../../../core/utils/api-list.util';
import { withCacheInvalidate, withInlineHandling } from '../../../core/http/http-context.tokens';
import { AccountListQuery, toAccountListParams } from '../../accounts/models/account.model';
import {
  CustomerDetails,
  SaveCustomerRequest,
  toCustomer,
  toCustomerDetails,
} from '../models/customer.model';

const ENDPOINT = 'dashboard/customers';
/** A customer's name and phone show on their orders — keep cached order pages honest. */
const RELATED = ['dashboard/orders'];

/**
 * Mobile-app customer accounts — full CRUD plus ban/unban (JSON bodies).
 * Cached per the central policy; every mutation evicts `dashboard/customers`.
 */
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);

  list(query: AccountListQuery = {}) {
    return this.api
      .get<unknown>(ENDPOINT, { params: toAccountListParams(query) })
      .pipe(toPaged(toCustomer));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toCustomerDetails));
  }

  create(request: SaveCustomerRequest) {
    return this.api
      .send<unknown>('POST', ENDPOINT, request, { context: withInlineHandling() })
      .pipe(map(toDetailsResult));
  }

  update(id: number, request: SaveCustomerRequest) {
    return this.api
      .send<unknown>('PUT', `${ENDPOINT}/${id}`, request, {
        context: withInlineHandling(withCacheInvalidate(RELATED)),
      })
      .pipe(map(toDetailsResult));
  }

  ban(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/ban`, null, { context: withInlineHandling() });
  }

  unban(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/unban`, null, { context: withInlineHandling() });
  }

  /** Soft delete. Refused (400) while the customer has unfinished orders or a wallet balance. */
  delete(id: number) {
    return this.api.send<null>('DELETE', `${ENDPOINT}/${id}`, null, {
      context: withInlineHandling(withCacheInvalidate(RELATED)),
    });
  }
}

function toDetailsResult(result: ApiResult<unknown>): ApiResult<CustomerDetails> {
  return { message: result.message, data: toCustomerDetails(result.data) };
}
