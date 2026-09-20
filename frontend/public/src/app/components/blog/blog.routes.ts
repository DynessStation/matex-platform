import { Routes } from '@angular/router';

import { BlogResolver } from '../../shared/resolver/blog.resolver';

export const blog: Routes = [
  {
    path: 'blogs',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./blog-details/blog-details').then((m) => m.BlogDetails),
    resolve: {
      data: BlogResolver,
    },
  },
];
