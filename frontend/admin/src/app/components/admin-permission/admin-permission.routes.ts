import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

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

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_permission.create',
    },

    loadComponent: () =>
      import('./create-admin-permission/create-admin-permission').then(
        (m) => m.CreateAdminPermission,
      ),
  },

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_permission.update',
    },

    loadComponent: () =>
      import('./edit-admin-permission/edit-admin-permission').then(
        (m) => m.EditAdminPermission,
      ),
  },
];
