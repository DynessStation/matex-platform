import { Routes } from '@angular/router';

export const licenseKeyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./license-key').then(m => m.LicenseKey),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create-license-key/create-license-key').then(m => m.CreateLicenseKey),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-license-key/edit-license-key').then(m => m.EditLicenseKey),
  },
];
