import { Routes } from '@angular/router';

export const roleRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./role').then(m => m.Role),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-role/create-role').then(m => m.CreateRole),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-role/edit-role').then(m => m.EditRole),
  },
];
