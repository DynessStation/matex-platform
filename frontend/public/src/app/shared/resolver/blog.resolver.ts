import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { GetBlogBySlugAction } from '../store/action/blog.action';

export const BlogResolver: ResolveFn<Observable<unknown>> = (route, _state) => {
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    throw new Error('Slug parameter is missing');
  }

  const locale = _state.url === '/en' || _state.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  return store.dispatch(new GetBlogBySlugAction(slug, locale));
};
