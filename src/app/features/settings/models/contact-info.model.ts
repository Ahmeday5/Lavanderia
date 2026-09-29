import { asRecord, asString } from '../../../core/utils/coerce.util';

/** Support contact details shown to customers and drivers in the apps. */
export interface ContactInfo {
  phoneNumber1: string;
  phoneNumber2: string;
  email: string;
}

export type UpdateContactInfoRequest = ContactInfo;

export function toContactInfo(raw: unknown): ContactInfo {
  const r = asRecord(raw);
  return {
    phoneNumber1: asString(r['phoneNumber1']),
    phoneNumber2: asString(r['phoneNumber2']),
    email: asString(r['email']),
  };
}
