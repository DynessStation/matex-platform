import { Routes } from '@angular/router';

export const subscriptionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./subscription').then(m => m.Subscription),
  },
];
