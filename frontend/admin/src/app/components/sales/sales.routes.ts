import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const salesRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'sales.view',
    },
    loadComponent: () => import('./sales').then((m) => m.Sales),
  },
];
