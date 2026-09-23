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

export const routes: Routes = [
  // ================================================
  // Legacy CMS URLs
  // Redirect ke public URL final.
  // ================================================

  {
    path: 'cms/id-ID/:slug',
    redirectTo: ({ params }) => (params['slug'] === 'home' ? '/' : `/${params['slug']}`),
    pathMatch: 'full',
  },
  {
    path: 'cms/en-US/:slug',
    redirectTo: ({ params }) => (params['slug'] === 'home' ? '/en' : `/en/${params['slug']}`),
    pathMatch: 'full',
  },

  // ================================================
  // MATEX Public - English
  // /en/about-us
  // ================================================

  {
    path: 'en',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          locale: 'en-US',
          slug: 'home',
        },
        loadComponent: () => import('./components/cms-page/cms-page').then((m) => m.CmsPage),
      },
      {
        path: ':slug',
        data: {
          locale: 'en-US',
        },
        loadComponent: () => import('./components/cms-page/cms-page').then((m) => m.CmsPage),
      },
    ],
  },

  // ================================================
  // MATEX Public - Homepage Indonesia
  // /
  // ================================================

  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          locale: 'id-ID',
          slug: 'home',
        },
        loadComponent: () => import('./components/cms-page/cms-page').then((m) => m.CmsPage),
      },
    ],
  },

  // ================================================
  // Legacy Kartify
  //
  // Sengaja masih dipertahankan selama development
  // supaya /home, /collections, dll tetap bisa
  // dipakai sebagai referensi template.
  // ================================================

  {
    path: '',
    loadComponent: () => import('./legacy-app').then((m) => m.LegacyApp),
    children: legacyRoutes,
  },

  // ================================================
  // MATEX Public - Default Indonesian
  //
  // HARUS setelah legacy selama Kartify masih hidup,
  // supaya /home, /cart, dll tidak dianggap CMS slug.
  // ================================================

  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: ':slug',
        data: {
          locale: 'id-ID',
        },
        loadComponent: () => import('./components/cms-page/cms-page').then((m) => m.CmsPage),
      },
    ],
  },
];
