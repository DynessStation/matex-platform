import { Routes } from '@angular/router';

import { AuthGuard } from './core/guard/auth.guard';

import { fullRoutes } from './shared/routes/full.routes';
import { content } from './shared/routes/routes';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },

  {
    path: 'auth',
    loadChildren: () =>
      import('./components/auth/auth.routes').then((m) => m.auth),
  },

  {
    path: '',

    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],

    loadComponent: () =>
      import('./shared/components/layout/content/content').then(
        (m) => m.Content,
      ),

    children: content,
  },

  {
    path: '',

    loadComponent: () =>
      import('./shared/components/layout/full/full').then((m) => m.Full),

    children: fullRoutes,
  },

  {
    path: '**',
    pathMatch: 'full',

    data: {
      titleKey: 'page_not_found',
    },

    loadComponent: () =>
      import('./errors/error404/error404').then((m) => m.Error404),
  },
];
