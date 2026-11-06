import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const costingRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'cost.view',
    },
    loadComponent: () => import('./costing').then((m) => m.Costing),
  },
];
