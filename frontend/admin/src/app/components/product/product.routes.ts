import { Routes } from '@angular/router';

export const productRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./product').then(m => m.Product),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-product/create-product').then(m => m.CreateProduct),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-product/edit-product').then(m => m.EditProduct),
  },
];
