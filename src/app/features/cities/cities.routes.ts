import { Routes } from '@angular/router';

export const citiesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cities-list/cities-list.component').then(
        (m) => m.CitiesListComponent,
      ),
  },
];
