import { Routes } from '@angular/router';

export const MenuRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./menu').then((m) => m.Menu),
  },
];
