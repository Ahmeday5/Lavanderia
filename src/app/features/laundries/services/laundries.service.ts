import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResult } from '../../../core/models/api-response.model';
import { UPLOAD_TIMEOUT_MS, toPaged } from '../../../core/utils/api-list.util';
import { toMultipartBody } from '../../../core/utils/form-data.util';
import {
  withCacheInvalidate,
  withInlineHandling,
  withTimeout,
} from '../../../core/http/http-context.tokens';
import { AccountListQuery, toAccountListParams } from '../../accounts/models/account.model';
import {
  LaundryDetails,
  SaveLaundryRequest,
  toLaundry,
  toLaundryDetails,
} from '../models/laundry.model';

const ENDPOINT = 'dashboard/laundries';
/** A laundry's name shows on its orders — keep cached order pages honest. */
const RELATED = ['dashboard/orders'];

/**
 * Laundry business accounts — full CRUD plus ban/unban. Cached per the central
 * policy; every mutation evicts `dashboard/laundries` automatically.
 * Mutations return the server's `message` (`ApiResult`) for the success toast.
 */
@Injectable({ providedIn: 'root' })
export class LaundriesService {
  private readonly api = inject(ApiService);

  list(query: AccountListQuery = {}) {
    return this.api
      .get<unknown>(ENDPOINT, { params: toAccountListParams(query) })
      .pipe(toPaged(toLaundry));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toLaundryDetails));
  }

  create(request: SaveLaundryRequest) {
    return this.api
      .send<unknown>('POST', ENDPOINT, toLaundryBody(request), {
        context: withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling()),
      })
      .pipe(map(toDetailsResult));
  }

  update(id: number, request: SaveLaundryRequest) {
    return this.api
      .send<unknown>('PUT', `${ENDPOINT}/${id}`, toLaundryBody(request), {
        context: withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling(withCacheInvalidate(RELATED))),
      })
      .pipe(map(toDetailsResult));
  }

  ban(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/ban`, null, { context: withInlineHandling() });
  }

  unban(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/unban`, null, { context: withInlineHandling() });
  }

  /** Soft delete. Refused (400) while the laundry has open orders or a wallet balance. */
  delete(id: number) {
    return this.api.send<null>('DELETE', `${ENDPOINT}/${id}`, null, {
      context: withInlineHandling(withCacheInvalidate(RELATED)),
    });
  }
}

function toLaundryBody(request: SaveLaundryRequest): FormData {
  return toMultipartBody({
    name: request.name,
    ownerName: request.ownerName,
    ownerPhoneNumber: request.ownerPhoneNumber,
    phoneNumber: request.phoneNumber,
    password: request.password,
    address: request.address,
    cityId: request.cityId,
    latitude: request.latitude,
    longitude: request.longitude,
    baseDeliveryFee: request.baseDeliveryFee,
    deliveryPricePerKm: request.deliveryPricePerKm,
    image: request.image,
  });
}

function toDetailsResult(result: ApiResult<unknown>): ApiResult<LaundryDetails> {
  return { message: result.message, data: toLaundryDetails(result.data) };
}
