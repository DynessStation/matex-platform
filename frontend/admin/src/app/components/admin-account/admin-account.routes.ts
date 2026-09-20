import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const adminAccountRoutes: Routes = [
  {
    path: '',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_account.view',
    },

    loadComponent: () => import('./admin-account').then((m) => m.AdminAccount),
  },

  {
    path: 'create',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_account.create',
    },

    loadComponent: () =>
      import('./create-admin-account/create-admin-account').then(
        (m) => m.CreateAdminAccount,
      ),
  },

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_account.update',
    },

    loadComponent: () =>
      import('./edit-admin-account/edit-admin-account').then(
        (m) => m.EditAdminAccount,
      ),
  },
];
