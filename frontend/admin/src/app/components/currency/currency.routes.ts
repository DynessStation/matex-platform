import { Routes } from '@angular/router';

export const currencyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./currency').then(m => m.Currency),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-currency/create-currency').then(m => m.CreateCurrency),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-currency/edit-currency').then(m => m.EditCurrency),
  },
];
