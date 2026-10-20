import { asNullableString, asRecord, asString } from '../../../core/utils/coerce.util';

/**
 * A single editable HTML document shown in the customer/driver apps
 * (privacy policy, scope of service, …). Stored and served as raw HTML.
 */
export interface ContentPage {
  content: string;
  /** ISO timestamp of the last edit, `null` if the server didn't send one. */
  updatedAt: string | null;
}

export interface UpdateContentPageRequest {
  content: string;
}

export function toContentPage(raw: unknown): ContentPage {
  const r = asRecord(raw);
  return {
    content: asString(r['content']),
    updatedAt: asNullableString(r['updatedAt']),
  };
}

/** Everything that differs between two content pages — the rest is shared UI. */
export interface ContentPageDefinition {
  /** Child route under `/settings`. */
  path: string;
  /** API path relative to the base URL, e.g. `dashboard/privacy-policy`. */
  endpoint: string;
  title: string;
  /** Short line under the title in the settings tabs. */
  hint: string;
  /** Font Awesome solid icon class, e.g. `fa-shield-halved`. */
  icon: string;
  placeholder: string;
}
