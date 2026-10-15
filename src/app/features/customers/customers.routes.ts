import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customers-list/customers-list.component').then(
        (m) => m.CustomersListComponent,
      ),
  },
  {
    path: 'new',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/customer-details/customer-details.component').then(
        (m) => m.CustomerDetailsComponent,
      ),
  },
  {
    path: ':id/edit',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
  },
];
