import { Routes } from '@angular/router';

export const home: Routes = [
  {
    path: '',
    loadComponent: () => import('./home').then((m) => m.Home),
  },
];
