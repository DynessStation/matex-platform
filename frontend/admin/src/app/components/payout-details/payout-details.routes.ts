import { Routes } from '@angular/router';

export const payoutDetailsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./payout-details').then(m => m.PayoutDetails),
  },
];
