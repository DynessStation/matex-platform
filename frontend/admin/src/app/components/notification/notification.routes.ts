import { Routes } from '@angular/router';

export const notificationRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./notification').then(m => m.Notification),
  },
];
