import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const cmsPageRoutes: Routes = [
  //==================================================
  //==== DETAIL
  //==================================================

  {
    path: ':id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'cms_page.view',

      titleKey: 'cms_page.detail_title',
    },

    loadComponent: () =>
      import('./cms-page-detail/cms-page-detail').then(
        (component) => component.CmsPageDetail,
      ),
  },

  //==================================================
  //==== LIST
  //==================================================

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
