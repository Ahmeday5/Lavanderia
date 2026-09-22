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
      // Add feature routes here, e.g.:
      // {
      //   path: 'users',
      //   canActivate: [permissionGuard('Users.Manage')],
      //   loadChildren: () => import('./features/users/users.routes').then((m) => m.usersRoutes),
      // },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '/dashboard' },
];
