import { Routes } from '@angular/router';

import { content } from './shared/routes/routes';

const legacyRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: content,
  },
  {
    path: 'coming-soon',
    loadComponent: () =>
      import('./components/page/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./components/page/maintenance/maintenance').then((m) => m.Maintenance),
  },
];

// MATEX CMS has its own shell; the template storefront remains isolated.
export const routes: Routes = [
  {
    path: 'cms',
    loadComponent: () => import('./layout/matex-layout/matex-layout').then((m) => m.MatexLayout),
    children: [
      {
        path: ':locale/:slug',
        loadComponent: () => import('./components/cms-page/cms-page').then((m) => m.CmsPage),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./legacy-app').then((m) => m.LegacyApp),
    children: legacyRoutes,
  },
];
