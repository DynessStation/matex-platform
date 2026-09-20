import { Routes } from '@angular/router';

export const taxRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tax').then(m => m.Tax),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-tax/create-tax').then(m => m.CreateTax),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-tax/edit-tax').then(m => m.EditTax),
  },
];
