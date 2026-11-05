import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { catchError, map, of } from 'rxjs';

import { movedSlugHandler } from './moved-slug';
import { GetBlogBySlugAction } from '../store/action/blog.action';

export const BlogResolver: ResolveFn<boolean | RedirectCommand> = (route, _state) => {
  // false: nothing found; the page shows the 404 view in place (resolved-missing.ts).
  const store = inject(Store);
  const onMissing = movedSlugHandler(route);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return of(false);
  }

  const locale = _state.url === '/en' || _state.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  return store.dispatch(new GetBlogBySlugAction(slug, locale)).pipe(
    map(() => true),
    catchError((error) => of(onMissing(error))),
  );
};
