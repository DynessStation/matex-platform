import { Routes } from '@angular/router';

import { Product } from './product/product';
import { CategoryResolver } from '../../shared/resolver/category.resolver';
import { ProductResolver } from '../../shared/resolver/product.resolver';

const versionTwoFeature = () =>
  import('../page/coming-soon/coming-soon').then((module) => module.ComingSoon);

export const shop: Routes = [
  {
    path: 'collections',
    loadComponent: () => import('./collection/collection').then((m) => m.Collection),
  },
  {
    path: 'katalog',
    loadComponent: () => import('./collection/collection').then((m) => m.Collection),
  },
  {
    path: 'en/catalog',
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
    path: 'en/cart',
    loadComponent: () => import('./cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./wishlist/wishlist').then((m) => m.Wishlist),
  },
  {
    path: 'en/wishlist',
    loadComponent: () => import('./wishlist/wishlist').then((m) => m.Wishlist),
  },
  {
    path: 'compare',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'seller/become-seller',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'seller/stores',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'seller/store/:slug',
    loadComponent: versionTwoFeature,
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
    loadComponent: versionTwoFeature,
  },
  {
    path: 'order/tracking',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'order/details',
    loadComponent: versionTwoFeature,
  },
  {
    path: 'order-success',
    loadComponent: versionTwoFeature,
  },
];
