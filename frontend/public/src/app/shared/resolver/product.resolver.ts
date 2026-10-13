import { inject, RESPONSE_INIT } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { GetProductBySlug } from '../store/action/product.action';

export const ProductResolver: ResolveFn<boolean> = async (route) => {
  const store = inject(Store);
  const router = inject(Router);
  const response = inject(RESPONSE_INIT, { optional: true });
  const slug = route.paramMap.get('slug');

  if (!slug) {
    if (response) response.status = 404;
    return new RedirectCommand(router.parseUrl('/404'));
  }

  try {
    await firstValueFrom(
      store.dispatch(
        new GetProductBySlug(slug, route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID'),
      ),
    );
    return true;
  } catch {
    if (response) response.status = 404;
    return new RedirectCommand(router.parseUrl('/404'));
  }
};
