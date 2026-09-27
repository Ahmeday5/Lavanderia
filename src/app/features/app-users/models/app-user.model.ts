import { asRecord, asString } from '../../../core/utils/coerce.util';

/**
 * Dashboard admin roles. Backend currently only issues `'Admin'` — extend
 * this union (and `APP_USER_ROLES` in the role-select) once more roles
 * become available.
 */
export type AppUserRole = 'Admin';

export const APP_USER_ROLES: readonly AppUserRole[] = ['Admin'];

/** A user with access to this dashboard (distinct from mobile app customers). */
export interface AppUser {
  id: string;
  email: string;
  role: AppUserRole;
}

export interface CreateAppUserRequest {
  email: string;
  password: string;
  role: AppUserRole;
}

/** Password is intentionally omitted — changing it is out of this form's scope. */
export interface UpdateAppUserRequest {
  email: string;
  role: AppUserRole;
}

/** Maps a raw API row into a well-formed `AppUser`. Unknown roles are shown as-is. */
export function toAppUser(raw: unknown): AppUser {
  const r = asRecord(raw);
  return {
    id: asString(r['id']),
    email: asString(r['email']),
    role: asString(r['role'], APP_USER_ROLES[0]) as AppUserRole,
  };
}
