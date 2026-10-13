import { inject, RESPONSE_INIT } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { GetCategoryBySlug } from '../store/action/category.action';

export const CategoryResolver: ResolveFn<boolean> = async (route) => {
  const store = inject(Store);
  const router = inject(Router);
  const response = inject(RESPONSE_INIT, { optional: true });
  const slug = route.paramMap.get('slug');

  if (!slug) {
    if (response) response.status = 404;
    return new RedirectCommand(router.parseUrl('/404'));
  }

  try {
    const locale = route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID';
    await firstValueFrom(store.dispatch(new GetCategoryBySlug(slug, locale)));
    return true;
  } catch {
    if (response) response.status = 404;
    return new RedirectCommand(router.parseUrl('/404'));
  }
};
