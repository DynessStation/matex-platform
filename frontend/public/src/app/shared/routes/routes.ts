import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/guard/auth.guard';

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
    loadChildren: () => import('../../components/account/account.routes').then((m) => m.account),
    canActivate: [AuthGuard],
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
