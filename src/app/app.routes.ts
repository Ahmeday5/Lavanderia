import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';

export const routes: Routes = [
  // Auth area — only reachable when NOT signed in
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layout/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Authenticated app shell
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'cities',
        loadChildren: () =>
          import('./features/cities/cities.routes').then((m) => m.citiesRoutes),
      },
      {
        path: 'services',
        loadChildren: () =>
          import('./features/services/services.routes').then((m) => m.servicesRoutes),
      },
      {
        path: 'app-users',
        loadChildren: () =>
          import('./features/app-users/app-users.routes').then((m) => m.appUsersRoutes),
      },
      {
        path: 'laundries',
        loadChildren: () =>
          import('./features/laundries/laundries.routes').then((m) => m.laundriesRoutes),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then((m) => m.customersRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '/dashboard' },
];
