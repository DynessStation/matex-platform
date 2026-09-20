import { Routes } from '@angular/router';

export const withdrawalRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./withdrawal').then(m => m.Withdrawal),
  },
];
