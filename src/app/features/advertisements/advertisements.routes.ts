import { Routes } from '@angular/router';

export const advertisementsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/advertisements-list/advertisements-list.component').then(
        (m) => m.AdvertisementsListComponent,
      ),
  },
];
