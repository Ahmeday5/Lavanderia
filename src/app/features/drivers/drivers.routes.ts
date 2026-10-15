import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/role.guard';
import { STAFF_ROLES } from '../../core/auth/auth.config';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const driversRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/drivers-list/drivers-list.component').then((m) => m.DriversListComponent),
  },
  {
    // Adding drivers is Admin-only on the server; mirror it so Editors never see the form.
    path: 'new',
    canActivate: [roleGuard([STAFF_ROLES.admin])],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/driver-form/driver-form.component').then((m) => m.DriverFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/driver-details/driver-details.component').then(
        (m) => m.DriverDetailsComponent,
      ),
  },
  {
    path: ':id/edit',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/driver-form/driver-form.component').then((m) => m.DriverFormComponent),
  },
];
