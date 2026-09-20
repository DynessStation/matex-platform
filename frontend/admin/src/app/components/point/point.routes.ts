import { Routes } from '@angular/router';

export const pointRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./point').then(m => m.Point),
  },
];
