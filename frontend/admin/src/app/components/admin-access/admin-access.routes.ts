import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const adminAccessRoutes: Routes = [
  {
    path: '',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_access.view',
    },

    loadComponent: () =>
      import('./admin-access').then((component) => component.AdminAccess),
  },

  {
    path: 'create',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_access.create',
    },

    loadComponent: () =>
      import('./create-admin-access/create-admin-access').then(
        (component) => component.CreateAdminAccess,
      ),
  },

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'admin_access.update',
    },

    loadComponent: () =>
      import('./edit-admin-access/edit-admin-access').then(
        (component) => component.EditAdminAccess,
      ),
  },
];
