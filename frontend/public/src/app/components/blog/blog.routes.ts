import { Routes } from '@angular/router';

import { BlogTagResolver } from '../../shared/resolver/blog-tag.resolver';
import { BlogResolver } from '../../shared/resolver/blog.resolver';

export const blog: Routes = [
  {
    path: 'artikel',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'en/articles',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'artikel/tag/:slug',
    loadComponent: () => import('./blog').then((m) => m.Blog),
    resolve: { data: BlogTagResolver },
  },
  {
    path: 'en/articles/tag/:slug',
    loadComponent: () => import('./blog').then((m) => m.Blog),
    resolve: { data: BlogTagResolver },
  },
  {
    path: 'blogs',
    redirectTo: 'artikel',
    pathMatch: 'full',
  },
  {
    path: 'en/blogs',
    redirectTo: 'en/articles',
    pathMatch: 'full',
  },
  {
    path: 'articles',
    redirectTo: 'artikel',
    pathMatch: 'full',
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
