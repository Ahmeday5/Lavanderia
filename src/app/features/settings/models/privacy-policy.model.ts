import { asNullableString, asRecord, asString } from '../../../core/utils/coerce.util';

/** The privacy policy shown in the customer/driver apps, stored as HTML. */
export interface PrivacyPolicy {
  content: string;
  /** ISO timestamp of the last edit, `null` if the server didn't send one. */
  updatedAt: string | null;
}

export interface UpdatePrivacyPolicyRequest {
  content: string;
}

export function toPrivacyPolicy(raw: unknown): PrivacyPolicy {
  const r = asRecord(raw);
  return {
    content: asString(r['content']),
    updatedAt: asNullableString(r['updatedAt']),
  };
}
