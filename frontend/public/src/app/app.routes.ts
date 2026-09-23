import { Routes } from '@angular/router';

import { content } from './shared/routes/routes';

export const routes: Routes = [
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
