import { Routes } from '@angular/router';

export const vendorWalletRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./vendor-wallet').then(m => m.VendorWallet),
  },
];
