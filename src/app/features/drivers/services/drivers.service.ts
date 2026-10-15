import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResult } from '../../../core/models/api-response.model';
import { UPLOAD_TIMEOUT_MS, toPaged } from '../../../core/utils/api-list.util';
import { MultipartValue, toMultipartBody } from '../../../core/utils/form-data.util';
import {
  withCacheInvalidate,
  withInlineHandling,
  withTimeout,
} from '../../../core/http/http-context.tokens';
import { AccountListQuery, toAccountListParams } from '../../accounts/models/account.model';
import {
  DriverDetails,
  SaveDriverRequest,
  toDriver,
  toDriverDetails,
} from '../models/driver.model';

const ENDPOINT = 'dashboard/drivers';
/** A driver's name shows on order trips — keep cached order pages honest. */
const RELATED = ['dashboard/orders'];

/**
 * Delivery drivers — full CRUD plus activate/deactivate (approval). Cached
 * with a short TTL (availability changes from the driver app, see
 * `cache-policy.ts`); every mutation evicts `dashboard/drivers`.
 */
@Injectable({ providedIn: 'root' })
export class DriversService {
  private readonly api = inject(ApiService);

  list(query: AccountListQuery = {}) {
    return this.api
      .get<unknown>(ENDPOINT, { params: toAccountListParams(query) })
      .pipe(toPaged(toDriver));
  }

  getById(id: number) {
    return this.api.get<unknown>(`${ENDPOINT}/${id}`).pipe(map(toDriverDetails));
  }

  /** Admin-only. */
  create(request: SaveDriverRequest) {
    return this.api
      .send<unknown>('POST', ENDPOINT, toDriverBody(request, true), {
        context: withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling()),
      })
      .pipe(map(toDetailsResult));
  }

  update(id: number, request: SaveDriverRequest) {
    return this.api
      .send<unknown>('PUT', `${ENDPOINT}/${id}`, toDriverBody(request, false), {
        context: withTimeout(UPLOAD_TIMEOUT_MS, withInlineHandling(withCacheInvalidate(RELATED))),
      })
      .pipe(map(toDetailsResult));
  }

  activate(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/activate`, null, { context: withInlineHandling() });
  }

  deactivate(id: number) {
    return this.api.send<null>('POST', `${ENDPOINT}/${id}/deactivate`, null, { context: withInlineHandling() });
  }

  /** Soft delete. Refused (400) while the driver has unfinished trips or a wallet balance. */
  delete(id: number) {
    return this.api.send<null>('DELETE', `${ENDPOINT}/${id}`, null, {
      context: withInlineHandling(withCacheInvalidate(RELATED)),
    });
  }
}

function toDriverBody(request: SaveDriverRequest, isCreate: boolean): FormData {
  const fields: Record<string, MultipartValue> = {
    fullName: request.fullName,
    phoneNumber: request.phoneNumber,
    password: request.password,
    nationalId: request.nationalId,
    dateOfBirth: request.dateOfBirth,
    cityId: request.cityId,
    address: request.address,
    licenseIssueDate: request.licenseIssueDate,
    licenseExpiryDate: request.licenseExpiryDate,
    vehicleType: request.vehicleType,
    vehicleMake: request.vehicleMake,
    vehicleModel: request.vehicleModel,
    vehicleYear: request.vehicleYear,
    vehicleColor: request.vehicleColor,
    plateNumber: request.plateNumber,
    ...request.images,
  };
  if (isCreate) fields['isActive'] = request.isActive ?? true;
  return toMultipartBody(fields);
}

function toDetailsResult(result: ApiResult<unknown>): ApiResult<DriverDetails> {
  return { message: result.message, data: toDriverDetails(result.data) };
}
