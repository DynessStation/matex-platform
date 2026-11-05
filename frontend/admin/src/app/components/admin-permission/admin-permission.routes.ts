import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

// One page: adding and editing happen in its panels, and its state is in the URL. The old form
// addresses lead there.
export const adminPermissionRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: {
      permission: 'admin_permission.view',
    },
    loadComponent: () =>
      import('./admin-permission').then((m) => m.AdminPermission),
  },
  {
    path: 'create',
    pathMatch: 'full',
    redirectTo: () => inject(Router).parseUrl('/admin-permission'),
  },
  {
    path: 'edit/:id',
    pathMatch: 'full',
    redirectTo: ({ params }) =>
      inject(Router).createUrlTree(['/admin-permission'], {
        queryParams: { edit: params['id'] },
      }),
  },
];
