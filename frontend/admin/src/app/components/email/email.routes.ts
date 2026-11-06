import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const emailRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'email.view',
    },
    loadComponent: () => import('./email').then((m) => m.Email),
  },
];
