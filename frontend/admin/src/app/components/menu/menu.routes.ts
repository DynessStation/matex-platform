import { Routes } from '@angular/router';

export const MenuRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./menu').then(m => m.Menu),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-menu/edit-menu').then(m => m.EditMenu),
  },
];
