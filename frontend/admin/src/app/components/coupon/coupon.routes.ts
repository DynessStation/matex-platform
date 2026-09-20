import { Routes } from '@angular/router';

export const couponRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./coupon').then(m => m.Coupon),
  },
  {
    path: 'create',
    loadComponent: () => import('./create-coupon/create-coupon').then(m => m.CreateCoupon),
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./edit-coupon/edit-coupon').then(m => m.EditCoupon),
  },
];
