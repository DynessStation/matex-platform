import { Routes } from '@angular/router';

export const categoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./category').then(m => m.Category),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-category/edit-category').then(m => m.EditCategory),
  },
];
