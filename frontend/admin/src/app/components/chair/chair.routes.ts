import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const chairRoutes: Routes = [
  {
    path: '',

    canActivate: [PermissionGuard],

    data: {
      permission: 'chair.view',
    },

    loadComponent: () => import('./chair').then((component) => component.Chair),
  },

  {
    path: 'create',

    canActivate: [PermissionGuard],

    data: {
      permission: 'chair.create',
    },

    loadComponent: () =>
      import('./create-chair/create-chair').then(
        (component) => component.CreateChair,
      ),
  },

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'chair.update',
    },

    loadComponent: () =>
      import('./edit-chair/edit-chair').then(
        (component) => component.EditChair,
      ),
  },
];
