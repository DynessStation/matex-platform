import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guard/permission.guard';

export const faqRoutes: Routes = [
  {
    path: '',
    canActivate: [PermissionGuard],
    data: { permission: 'faq.view' },
    loadComponent: () => import('./faq').then(m => m.Faq),
  },
  {
    path: 'create',
    canActivate: [PermissionGuard],
    data: { permission: 'faq.create' },
    loadComponent: () => import('./create-faq/create-faq').then(m => m.CreateFaq),
  },
  {
    path: 'edit/:id',
    canActivate: [PermissionGuard],
    data: { permission: 'faq.update' },
    loadComponent: () => import('./edit-faq/edit-faq').then(m => m.EditFaq),
  },
];
