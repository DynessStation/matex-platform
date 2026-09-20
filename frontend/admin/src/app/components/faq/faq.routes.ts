import { Routes } from '@angular/router';

export const faqRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./faq').then(m => m.Faq),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-faq/create-faq').then(m => m.CreateFaq),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-faq/edit-faq').then(m => m.EditFaq),
  },
];
