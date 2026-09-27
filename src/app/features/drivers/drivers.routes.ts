import { Routes } from '@angular/router';

export const driversRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/drivers-list/drivers-list.component').then(
        (m) => m.DriversListComponent,
      ),
  },
];
