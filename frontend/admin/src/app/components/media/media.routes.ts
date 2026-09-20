import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const mediaRoutes: Routes = [
  {
    path: '',

    canActivate: [PermissionGuard],

    data: {
      permission: 'attachment.view',
    },

    loadComponent: () => import('./media').then((m) => m.Media),
  },
];
