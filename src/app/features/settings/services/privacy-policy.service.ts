import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  withInlineHandling,
  withNoCache,
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import {
  PrivacyPolicy,
  UpdatePrivacyPolicyRequest,
  toPrivacyPolicy,
} from '../models/privacy-policy.model';

const ENDPOINT = 'dashboard/privacy-policy';

/**
 * Privacy policy — a single HTML document, rendered by the backend/apps.
 *
 * Reads bypass the HTTP cache: this is an edit form, and starting from a
 * stale copy would let a save silently overwrite someone else's changes.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyPolicyService {
  private readonly api = inject(ApiService);

  get() {
    return this.api
      .get<unknown>(ENDPOINT, { context: withNoCache(withSkipLoader()) })
      .pipe(map(toPrivacyPolicy));
  }

  update(payload: UpdatePrivacyPolicyRequest) {
    return this.api
      .put<unknown>(ENDPOINT, payload, { context: withInlineHandling() })
      .pipe(map(toPrivacyPolicy));
  }
}
