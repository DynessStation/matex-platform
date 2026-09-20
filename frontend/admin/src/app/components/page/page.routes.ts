import { Routes } from '@angular/router';

export const pageRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./page').then(m => m.Page),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-page/create-page').then(m => m.CreatePage),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-page/edit-page').then(m => m.EditPage),
  },
];
