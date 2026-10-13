import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export default [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'dashboard.view',
      titleKey: 'seo_search_console',
    },
    loadComponent: () =>
      import('./seo-console').then((module) => module.SeoConsole),
  },
] as Routes;
