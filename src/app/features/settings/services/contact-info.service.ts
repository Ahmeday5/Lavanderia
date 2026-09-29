import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  withInlineHandling,
  withNoCache,
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import { ContactInfo, UpdateContactInfoRequest, toContactInfo } from '../models/contact-info.model';

const ENDPOINT = 'dashboard/contacts';

/**
 * Support contact details (phones + email) — a single settings record.
 * Reads bypass the HTTP cache for the same reason as `PrivacyPolicyService`.
 */
@Injectable({ providedIn: 'root' })
export class ContactInfoService {
  private readonly api = inject(ApiService);

  get() {
    return this.api
      .get<unknown>(ENDPOINT, { context: withNoCache(withSkipLoader()) })
      .pipe(map(toContactInfo));
  }

  update(payload: UpdateContactInfoRequest) {
    return this.api
      .put<unknown>(ENDPOINT, payload, { context: withInlineHandling() })
      .pipe(map(toContactInfo));
  }
}
