import { Routes } from '@angular/router';
import { orderOwnerGuard } from './guards/order-owner.guard';

export const ordersRoutes: Routes = [
  {
    // e.g. /orders/laundry/1?status=Ready&name=…
    path: ':ownerType/:ownerId',
    canActivate: [orderOwnerGuard],
    loadComponent: () =>
      import('./pages/owner-orders/owner-orders.component').then((m) => m.OwnerOrdersComponent),
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
