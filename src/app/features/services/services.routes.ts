import { Routes } from '@angular/router';

export const servicesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/services-list/services-list.component').then(
        (m) => m.ServicesListComponent,
      ),
  },
];
