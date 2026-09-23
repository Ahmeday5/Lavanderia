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
