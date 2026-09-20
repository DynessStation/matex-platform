import { Routes } from '@angular/router';

export const themeOptionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./theme-option').then(m => m.ThemeOption),
  },
];
