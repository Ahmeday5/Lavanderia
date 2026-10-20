import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  withInlineHandling,
  withNoCache,
  withSkipLoader,
} from '../../../core/http/http-context.tokens';
import {
  ContentPage,
  UpdateContentPageRequest,
  toContentPage,
} from '../models/content-page.model';

/**
 * Rich-text content pages (privacy policy, scope of service, …) — each one a
 * single HTML document at its own endpoint, rendered as-is by the apps.
 *
 * Reads bypass the HTTP cache: this is an edit form, and starting from a
 * stale copy would let a save silently overwrite someone else's changes.
 */
@Injectable({ providedIn: 'root' })
export class ContentPageService {
  private readonly api = inject(ApiService);

  get(endpoint: string) {
    return this.api
      .get<unknown>(endpoint, { context: withNoCache(withSkipLoader()) })
      .pipe(map(toContentPage));
  }

  update(endpoint: string, payload: UpdateContentPageRequest) {
    return this.api
      .put<unknown>(endpoint, payload, { context: withInlineHandling() })
      .pipe(map(toContentPage));
  }
}
