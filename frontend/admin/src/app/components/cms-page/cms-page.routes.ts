import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const cmsPageRoutes: Routes = [
  {
    path: '',

    pathMatch: 'full',

    canActivate: [PermissionGuard],

    data: {
      permission: 'cms_page.view',

      titleKey: 'pages',
    },

    loadComponent: () =>
      import('./cms-page').then((component) => component.CmsPage),
  },
];
