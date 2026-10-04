import { Routes } from '@angular/router';

import { PermissionGuard } from '../../core/guard/permission.guard';

export const websitePageRoutes: Routes = [
  {
    path: ':key',
    canActivate: [PermissionGuard],
    data: {
      permission: 'website_page.update',
      titleKey: 'website_page.edit_title',
    },
    loadComponent: () =>
      import('./edit-website-page/edit-website-page').then(
        (component) => component.EditWebsitePage,
      ),
  },
];
