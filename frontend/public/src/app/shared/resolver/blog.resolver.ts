import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { catchError, map, of } from 'rxjs';

import { GetBlogBySlugAction } from '../store/action/blog.action';

export const BlogResolver: ResolveFn<boolean> = (route, _state) => {
  // false: nothing found; the page shows the 404 view in place (resolved-missing.ts).
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return of(false);
  }

  const locale = _state.url === '/en' || _state.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  return store.dispatch(new GetBlogBySlugAction(slug, locale)).pipe(
    map(() => true),
    catchError(() => of(false)),
  );
};
