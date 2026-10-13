import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export default [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'dashboard.view',
      titleKey: 'public_analytics',
    },
    loadComponent: () =>
      import('./public-analytics').then((module) => module.PublicAnalytics),
  },
] as Routes;
