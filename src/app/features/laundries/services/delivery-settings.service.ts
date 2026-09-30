import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  withInlineHandling,
  withNoCache,
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import { UpdateDeliverySettingsRequest, toDeliverySettings } from '../models/delivery-settings.model';

const ENDPOINT = 'dashboard/delivery-settings';

/**
 * Delivery pricing settings — a single platform-wide record. Reads bypass the
 * HTTP cache: the value is edited right before it's shown, and a stale fee
 * would make the form's "unchanged" baseline wrong.
 */
@Injectable({ providedIn: 'root' })
export class DeliverySettingsService {
  private readonly api = inject(ApiService);

  get() {
    return this.api
      .get<unknown>(ENDPOINT, { context: withNoCache(withSkipLoader()) })
      .pipe(map(toDeliverySettings));
  }

  update(payload: UpdateDeliverySettingsRequest) {
    return this.api
      .put<unknown>(ENDPOINT, payload, { context: withInlineHandling() })
      .pipe(map(toDeliverySettings));
  }
}
