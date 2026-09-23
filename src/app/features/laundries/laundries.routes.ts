import { Routes } from '@angular/router';

export const laundriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/laundries-list/laundries-list.component').then(
        (m) => m.LaundriesListComponent,
      ),
  },
];
