import { Routes } from '@angular/router';

export const storeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./stores').then(m => m.Stores),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-store/create-store').then(m => m.CreateStore),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-store/edit-store').then(m => m.EditStore),
  },
];
