import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const officeRoutes: Routes = [
  {
    path: '',

    canActivate: [PermissionGuard],

    data: {
      permission: 'office.view',
    },

    loadComponent: () =>
      import('./office').then((component) => component.Office),
  },

  {
    path: 'create',

    canActivate: [PermissionGuard],

    data: {
      permission: 'office.create',
    },

    loadComponent: () =>
      import('./create-office/create-office').then(
        (component) => component.CreateOffice,
      ),
  },

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'office.update',
    },

    loadComponent: () =>
      import('./edit-office/edit-office').then(
        (component) => component.EditOffice,
      ),
  },
];
