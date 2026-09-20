import { Routes } from '@angular/router';

export const commissionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./commission').then(m => m.Commission),
  },
];
