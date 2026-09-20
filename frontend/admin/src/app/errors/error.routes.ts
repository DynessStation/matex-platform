import { Routes } from '@angular/router';

export const errorRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '403',
        loadComponent: () => import('./error403/error403').then(m => m.Error403),
      },
    ],
  },
];
