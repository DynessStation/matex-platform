import { Routes } from '@angular/router';

export const reviewRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./review').then(m => m.Review),
  },
];
