import { Routes } from '@angular/router';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customers-list/customers-list.component').then(
        (m) => m.CustomersListComponent,
      ),
  },
];
