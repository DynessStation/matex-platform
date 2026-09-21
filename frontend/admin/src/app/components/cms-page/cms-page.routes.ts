import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

//==================================================
//==== ROUTES
//==================================================

export const cmsPageRoutes: Routes = [
  //==================================================
  //==== CREATE
  //==================================================

  {
    path: 'create',

    canActivate: [PermissionGuard],

    data: {
      permission: 'cms_page.create',

      titleKey: 'cms_page.create_title',
    },

    loadComponent: () =>
      import('./create-cms-page/create-cms-page').then(
        (component) => component.CreateCmsPage,
      ),
  },

  //==================================================
  //==== EDIT
  //==================================================

  {
    path: 'edit/:id',

    canActivate: [PermissionGuard],

    data: {
      permission: 'cms_page.update',

      titleKey: 'cms_page.edit_title',
    },

    loadComponent: () =>
      import('./edit-cms-page/edit-cms-page').then(
        (component) => component.EditCmsPage,
      ),
  },

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
