import { ConfirmDialogConfig } from '../../../core/services/dialog.service';
import { MAX_PAGE_SIZE, PagedQuery } from '../../../core/models/api-response.model';
import { toPagedParams } from '../../../core/utils/api-list.util';
import { toLatinDigits } from '../../../core/utils/local-search.util';

/**
 * Shared vocabulary of the three account types managed from the dashboard —
 * laundries, customers and drivers. They share the same list contract
 * (search + soft-delete visibility), password rules and delete semantics, so
 * those live here once instead of three times.
 */

export interface AccountListQuery extends PagedQuery {
  /** Also list soft-deleted accounts (hidden by default). */
  includeDeleted?: boolean;
}

/** Page sizes offered on account lists — the backend caps `pageSize` at 50. */
export const ACCOUNT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50];

/**
 * Query string of `GET dashboard/{laundries|customers|drivers}`. The server
 * search matches phones in any format, ids (`123` / `#123`) and names; digits
 * typed in Arabic-Indic are converted so they match stored Latin ones.
 */
export function toAccountListParams(query: AccountListQuery): Record<string, unknown> {
  return {
    ...toPagedParams({
      pageIndex: query.pageIndex,
      pageSize: query.pageSize ? Math.min(query.pageSize, MAX_PAGE_SIZE) : undefined,
      search: query.search ? toLatinDigits(query.search) : undefined,
    }),
    includeDeleted: query.includeDeleted ? true : undefined,
  };
}

// ── passwords ──

export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;

/** Shown under the password field when editing — the field is optional there. */
export const PASSWORD_EDIT_HINT =
  'اتركه فارغاً للإبقاء على كلمة المرور الحالية. تغييره سيسجل خروج المستخدم من كل الأجهزة';

/** Shown under the phone field when editing — it is the account's login. */
export const PHONE_EDIT_HINT = 'هذا رقم الدخول. تغييره سيسجل خروج المستخدم من كل الأجهزة';

// ── status badges ──

export type AccountBadgeTone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';

export interface AccountBadge {
  label: string;
  tone: AccountBadgeTone;
  icon: string;
}

export const DELETED_BADGE: AccountBadge = { label: 'محذوف', tone: 'muted', icon: 'fa-trash-can' };

/** Fields every account DTO carries for soft-delete display. */
export interface SoftDeletable {
  isDeleted: boolean;
}

// ── deletion ──

/**
 * Soft delete wipes the account's personal data for good. The server refuses
 * (400, with an Arabic `message`) while the account has unfinished orders or
 * trips, or a wallet balance — that message is shown as-is.
 */
export function accountDeleteConfirmation(noun: string, name: string): ConfirmDialogConfig {
  return {
    title: `حذف ${noun}`,
    message: `سيتم حذف ${noun} "${name}" ومسح البيانات الشخصية للحساب نهائياً ولا يمكن التراجع.`,
    confirmText: 'حذف نهائي',
    type: 'danger',
  };
}
