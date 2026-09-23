import { Routes } from '@angular/router';

export const appUsersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/app-users-list/app-users-list.component').then(
        (m) => m.AppUsersListComponent,
      ),
  },
];
