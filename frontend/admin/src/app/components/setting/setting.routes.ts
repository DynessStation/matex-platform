import { Routes } from '@angular/router';

export const SettingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./setting').then(m => m.Setting),
  },
];
