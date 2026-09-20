import { Routes } from '@angular/router';

export const attributeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./attribute').then(m => m.Attribute),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-attribute/create-attribute').then(m => m.CreateAttribute),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-attribute/edit-attribute').then(m => m.EditAttribute),
  },
];
