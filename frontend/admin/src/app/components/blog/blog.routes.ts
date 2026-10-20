import { Routes } from '@angular/router';

export const blogRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./blog').then((m) => m.Blog),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create-blog/create-blog').then((m) => m.CreateBlog),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./edit-blog/edit-blog').then((m) => m.EditBlog),
  },
  {
    path: 'category',
    loadComponent: () =>
      import('./category/blog-category/blog-category').then(
        (m) => m.BlogCategory,
      ),
  },
  {
    path: 'category/edit/:id',
    loadComponent: () =>
      import('./category/edit-blog-category/edit-blog-category').then(
        (m) => m.EditBlogCategory,
      ),
  },
];
