import { Routes } from '@angular/router';

export const content: Routes = [
  {
    path: 'home',
    loadChildren: () => import('../../components/home/home.routes').then((m) => m.home),
  },
  {
    path: 'en',
    loadComponent: () => import('../../components/home/home').then((m) => m.Home),
  },
  {
    path: 'account',
    loadComponent: () =>
      import('../../components/page/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
  {
    path: 'en/account',
    loadComponent: () =>
      import('../../components/page/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
  {
    path: '',
    loadChildren: () => import('../../components/shop/shop.routes').then((m) => m.shop),
  },
  {
    path: '',
    loadChildren: () => import('../../components/blog/blog.routes').then((m) => m.blog),
  },
  {
    path: '',
    loadChildren: () => import('../../components/page/page.routes').then((m) => m.page),
  },
];
