import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

const websitePageUrl = (key: string) =>
  inject(Router).parseUrl(`/website-page/${key}`);

/**
 * Compatibility redirects for bookmarks created before fixed website pages
 * were separated from the generic CMS module. The legacy components and API
 * remain in the repository until the final cleanup migration.
 */
export const cmsPageRoutes: Routes = [
  {
    path: 'fixed/:key',
    pathMatch: 'full',
    redirectTo: ({ params }) => websitePageUrl(params['key']),
  },
  {
    path: '**',
    redirectTo: () => websitePageUrl('home'),
  },
];
