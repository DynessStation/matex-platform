import { inject, RESPONSE_INIT } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { catchError, of } from 'rxjs';

import { GetBlogBySlugAction } from '../store/action/blog.action';

export const BlogResolver: ResolveFn<unknown> = (route, _state) => {
  const store = inject(Store);
  const router = inject(Router);
  const response = inject(RESPONSE_INIT, { optional: true });
  const slug = route.paramMap.get('slug');

  if (!slug) {
    if (response) response.status = 404;
    return of(new RedirectCommand(router.parseUrl('/404')));
  }

  const locale = _state.url === '/en' || _state.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  return store.dispatch(new GetBlogBySlugAction(slug, locale)).pipe(
    catchError(() => {
      if (response) response.status = 404;
      return of(new RedirectCommand(router.parseUrl('/404')));
    }),
  );
};
