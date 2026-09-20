import { Routes } from '@angular/router';

export const shippingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shipping').then(m => m.Shipping),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./shipping-country/shipping-country').then(m => m.ShippingCountry),
  },
];
