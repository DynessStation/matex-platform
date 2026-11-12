import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const moneyRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'money.view',
    },
    loadComponent: () => import('./money').then((m) => m.Money),
  },
];
