import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn } from '@angular/router';

import { catchError, of } from 'rxjs';

import { movedSlugHandler } from './moved-slug';
import { IBlogTagPage } from '../interface/blog.interface';
import { BlogService } from '../services/blog.service';

// The tag of a tag page. false: nothing found, the page shows the 404 view in place
// (resolved-missing.ts). A renamed tag's old address moves permanently.
export const BlogTagResolver: ResolveFn<IBlogTagPage | false | RedirectCommand> = (route) => {
  const service = inject(BlogService);
  const onMissing = movedSlugHandler(route);
  const slug = route.paramMap.get('slug');
  if (!slug) return of(false as const);
  const locale = route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID';
  return service.getTag(locale, slug).pipe(catchError((error) => of(onMissing(error))));
};
