import { Routes } from '@angular/router';

export const refundRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./refund').then(m => m.Refund),
  },
];
