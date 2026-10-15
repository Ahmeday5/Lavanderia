import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const laundriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/laundries-list/laundries-list.component').then(
        (m) => m.LaundriesListComponent,
      ),
  },
  {
    path: 'new',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/laundry-form/laundry-form.component').then((m) => m.LaundryFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/laundry-details/laundry-details.component').then(
        (m) => m.LaundryDetailsComponent,
      ),
  },
  {
    path: ':id/edit',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/laundry-form/laundry-form.component').then((m) => m.LaundryFormComponent),
  },
];
