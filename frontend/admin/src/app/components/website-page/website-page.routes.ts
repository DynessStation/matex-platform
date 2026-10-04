import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const websitePageRoutes: Routes = [
  {
    path: ':key',
    canActivate: [PermissionGuard],
    data: {
      permission: 'cms_page.update',
      titleKey: 'cms_page.edit_title',
    },
    loadComponent: () =>
      import('../cms-page/edit-cms-page/edit-cms-page').then(
        (component) => component.EditCmsPage,
      ),
  },
];
