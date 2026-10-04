import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { content } from './shared/routes/routes';

const legacyCmsRedirects: Record<string, string> = {
  'cms/id-ID/home': '/',
  'cms/en-US/home': '/en',
  'cms/id-ID/tentang-kami': '/tentang-matex',
  'cms/en-US/about-us': '/en/about-matex',
  'cms/id-ID/syarat-ketentuan': '/syarat-ketentuan',
  'cms/en-US/terms-and-conditions': '/en/terms-and-conditions',
  'cms/id-ID/karir': '/karir',
  'cms/en-US/careers': '/en/careers',
};

const legacyCmsRoutes: Routes = Object.entries(legacyCmsRedirects).map(([path, target]) => ({
  path,
  pathMatch: 'full',
  redirectTo: () => inject(Router).parseUrl(target),
}));

export const routes: Routes = [
  ...legacyCmsRoutes,
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./components/home/home').then((m) => m.Home),
      },
      ...content,
    ],
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
