import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user').then(m => m.User),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-user/create-user').then(m => m.CreateUser),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-user/edit-user').then(m => m.EditUser),
  },
];
