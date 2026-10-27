import { Routes } from '@angular/router';

export const fullRoutes: Routes = [
  // What changed per version; open without signing in so the link can be shared.
  {
    path: 'changelog',
    loadComponent: () =>
      import('../../components/changelog/changelog').then((m) => m.Changelog),
  },
  {
    path: 'error',
    loadChildren: () =>
      import('../../errors/error.routes').then((r) => r.errorRoutes),
  },
];
