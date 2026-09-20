import { Routes } from '@angular/router';

export const noticeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./notice').then(m => m.Notice),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-notice/create-notice').then(m => m.CreateNotice),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-notice/edit-notice').then(m => m.EditNotice),
  },
];
