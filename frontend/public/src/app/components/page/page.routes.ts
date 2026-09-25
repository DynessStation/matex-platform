import { Routes } from '@angular/router';

import { PageResolver } from '../../shared/resolver/page.resolver';

export const page: Routes = [
  {
    path: 'search',
    loadComponent: () => import('./search/search').then((m) => m.Search),
  },
  {
    path: 'en/search',
    loadComponent: () => import('./search/search').then((m) => m.Search),
  },
  {
    path: 'faq',
    loadComponent: () => import('./faq/faq').then((m) => m.Faq),
  },
  {
    path: 'en/faq',
    loadComponent: () => import('./faq/faq').then((m) => m.Faq),
  },
  {
    path: 'about-us',
    loadComponent: () => import('./about-us/about-us').then((m) => m.AboutUs),
  },
  {
    path: '400',
    loadComponent: () => import('./error-400/error-400').then((m) => m.Error400),
  },
  {
    path: '404',
    loadComponent: () => import('./error-404/error-404').then((m) => m.Error404),
  },
  {
    path: '500',
    loadComponent: () => import('./error-500/error-500').then((m) => m.Error500),
  },
  {
    path: 'contact-us',
    loadComponent: () => import('./contact-us/contact-us').then((m) => m.ContactUs),
  },
  {
    path: 'kontak',
    loadComponent: () => import('./contact-us/contact-us').then((m) => m.ContactUs),
  },
  {
    path: 'en/contact-us',
    loadComponent: () => import('./contact-us/contact-us').then((m) => m.ContactUs),
  },
  {
    path: 'tentang-matex',
    loadComponent: () => import('../../components/cms-page/cms-page').then((m) => m.CmsPage),
    data: { locale: 'id-ID', slug: 'tentang-kami' },
  },
  {
    path: 'en/about-matex',
    loadComponent: () => import('../../components/cms-page/cms-page').then((m) => m.CmsPage),
    data: { locale: 'en-US', slug: 'about-us' },
  },
  {
    path: 'en/:slug',
    loadComponent: () => import('../../components/cms-page/cms-page').then((m) => m.CmsPage),
    data: { locale: 'en-US' },
  },
  {
    path: 'page/:slug',
    loadComponent: () => import('./page/page').then((m) => m.Page),
    resolve: {
      data: PageResolver,
    },
  },
  {
    path: ':slug',
    loadComponent: () => import('../../components/cms-page/cms-page').then((m) => m.CmsPage),
    data: { locale: 'id-ID' },
  },
];
