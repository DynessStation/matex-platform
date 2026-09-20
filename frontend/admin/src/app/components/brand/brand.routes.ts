import { Routes } from '@angular/router';

export const brandRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./brand').then(m => m.Brand),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-brand/create-brand').then(m => m.CreateBrand),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-brand/edit-brand').then(m => m.EditBrand),
  },
];
