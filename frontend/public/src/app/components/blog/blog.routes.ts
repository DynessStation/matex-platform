import { Routes } from '@angular/router';

import { BlogResolver } from '../../shared/resolver/blog.resolver';

export const blog: Routes = [
  {
    path: 'blogs',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'en/articles',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'en/blogs',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'articles',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./blog-details/blog-details').then((m) => m.BlogDetails),
    resolve: {
      data: BlogResolver,
    },
  },
  {
    path: 'en/article/:slug',
    loadComponent: () => import('./blog-details/blog-details').then((m) => m.BlogDetails),
    resolve: { data: BlogResolver },
  },
  {
    path: 'artikel/:slug',
    loadComponent: () => import('./blog-details/blog-details').then((m) => m.BlogDetails),
    resolve: { data: BlogResolver },
  },
];
