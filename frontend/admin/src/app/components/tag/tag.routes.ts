import { Routes } from '@angular/router';

export const tagRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tag').then(m => m.Tag),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-tag/create-tag').then(m => m.CreateTag),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-tag/edit-tag').then(m => m.EditTag),
  },
];
