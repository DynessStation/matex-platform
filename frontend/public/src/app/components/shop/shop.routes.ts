import { Routes } from '@angular/router';

import { Product } from './product/product';
import { AuthGuard } from '../../core/guard/auth.guard';
import { CheckoutGuard } from '../../core/guard/checkout.guard';
import { BrandResolver } from '../../shared/resolver/brand.resolver';
import { CategoryResolver } from '../../shared/resolver/category.resolver';
import { ProductResolver } from '../../shared/resolver/product.resolver';
import { StoreResolver } from '../../shared/resolver/store.resolver';

export const shop: Routes = [
  {
    path: 'collections',
    loadComponent: () => import('./collection/collection').then((m) => m.Collection),
  },
  {
    path: 'produk/:slug',
    component: Product,
    resolve: {
      data: ProductResolver,
    },
  },
  {
    path: 'en/product/:slug',
    component: Product,
    resolve: { data: ProductResolver },
  },
  {
    path: 'product/:slug',
    redirectTo: 'produk/:slug',
    pathMatch: 'full',
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout').then((m) => m.Checkout),
    canActivate: [CheckoutGuard],
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./wishlist/wishlist').then((m) => m.Wishlist),
    canActivate: [AuthGuard],
  },
  {
    path: 'compare',
    loadComponent: () => import('./compare/compare').then((m) => m.Compare),
    canActivate: [AuthGuard],
  },
  {
    path: 'seller/become-seller',
    loadComponent: () => import('./seller/seller').then((m) => m.Seller),
  },
  {
    path: 'seller/stores',
    loadComponent: () => import('./seller/seller-store/seller-store').then((m) => m.SellerStore),
  },
  {
    path: 'seller/store/:slug',
    loadComponent: () =>
      import('./seller/seller-details/seller-details').then((m) => m.SellerDetails),
    resolve: {
      data: StoreResolver,
    },
  },
  {
    path: 'kategori/:slug',
    loadComponent: () => import('./category/category').then((m) => m.Category),
    resolve: {
      data: CategoryResolver,
    },
  },
  {
    path: 'en/category/:slug',
    loadComponent: () => import('./category/category').then((m) => m.Category),
    resolve: {
      data: CategoryResolver,
    },
  },
  {
    path: 'category/:slug',
    redirectTo: 'kategori/:slug',
    pathMatch: 'full',
  },
  {
    path: 'brand/:slug',
    loadComponent: () => import('./brand/brand').then((m) => m.Brand),
    resolve: {
      data: BrandResolver,
    },
  },
  {
    path: 'order/tracking',
    loadComponent: () => import('./order-tracking/order-tracking').then((m) => m.OrderTracking),
  },
  {
    path: 'order/details',
    loadComponent: () => import('./order-details/order-details').then((m) => m.OrderDetails),
  },
  {
    path: 'order-success',
    loadComponent: () => import('./order-success/order-success').then((m) => m.OrderSuccess),
  },
];
