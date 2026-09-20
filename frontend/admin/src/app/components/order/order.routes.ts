import { Routes } from '@angular/router';

export const orderRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./order').then(m => m.Order),
  },
  {
    path: 'details/:id',
    loadComponent: () => import('./details/details').then(m => m.Details),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-order/create-order').then(m => m.CreateOrder),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout').then(m => m.Checkout),
  },
];
