import { Routes } from '@angular/router';

import { AuthGuard } from 'src/app/core/guard/auth.guard';

import { environment } from '../../../environments/environment';

export const content: Routes = [
  // Sample page of the shared parts: never in a production build.
  ...(environment.production
    ? []
    : [
        {
          path: 'ui-kit',
          canActivate: [AuthGuard],
          loadComponent: () =>
            import('../../components/ui-kit/ui-kit').then((m) => m.UiKit),
        },
      ]),
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('../../components/dashboard/dashboard.routes'),
  },
  {
    path: 'public-analytics',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/public-analytics/public-analytics.routes'),
  },
  {
    path: 'seo-console',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/seo-console/seo-console.routes'),
  },
  {
    path: 'admin-account',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/admin-account/admin-account.routes').then(
        (routes) => routes.adminAccountRoutes,
      ),
  },
  {
    path: 'admin-permission',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/admin-permission/admin-permission.routes').then(
        (routes) => routes.adminPermissionRoutes,
      ),
  },
  {
    path: 'admin-access',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/admin-access/admin-access.routes').then(
        (routes) => routes.adminAccessRoutes,
      ),
  },
  {
    path: 'activity-log',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/activity-log/activity-log.routes').then(
        (routes) => routes.activityLogRoutes,
      ),
  },
  {
    path: 'chair',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/chair/chair.routes').then(
        (routes) => routes.chairRoutes,
      ),
  },
  {
    path: 'office',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/office/office.routes').then(
        (routes) => routes.officeRoutes,
      ),
  },
  {
    path: 'website-page',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/website-page/website-page.routes').then(
        (routes) => routes.websitePageRoutes,
      ),
  },
  {
    path: 'public-contact',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/public-contact/public-contact.routes').then(
        (routes) => routes.publicContactRoutes,
      ),
  },
  {
    path: 'account',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/account/account.routes').then(
        (routes) => routes.accountRoutes,
      ),
  },
  {
    path: 'product',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/product/product.routes').then(
        (routes) => routes.productRoutes,
      ),
  },
  {
    path: 'category',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/category/category.routes').then(
        (routes) => routes.categoryRoutes,
      ),
  },
  {
    path: 'costing',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/costing/costing.routes').then(
        (routes) => routes.costingRoutes,
      ),
  },
  {
    path: 'business',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/business/business.routes').then(
        (routes) => routes.businessRoutes,
      ),
  },
  {
    path: 'sales',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/sales/sales.routes').then(
        (routes) => routes.salesRoutes,
      ),
  },
  {
    path: 'email',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/email/email.routes').then(
        (routes) => routes.emailRoutes,
      ),
  },
  {
    path: 'media',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/media/media.routes').then(
        (routes) => routes.mediaRoutes,
      ),
  },
  {
    path: 'blog',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/blog/blog.routes').then(
        (routes) => routes.blogRoutes,
      ),
  },
  {
    path: 'faq',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/faq/faq.routes').then(
        (routes) => routes.faqRoutes,
      ),
  },
  {
    path: 'menu',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../../components/menu/menu.routes').then(
        (routes) => routes.MenuRoutes,
      ),
  },
];
