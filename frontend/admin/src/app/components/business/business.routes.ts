import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const businessRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'business.view',
    },
    loadComponent: () => import('./business').then((m) => m.Business),
  },
];
