import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { movedSlugHandler } from './moved-slug';
import { GetProductBySlug } from '../store/action/product.action';

export const ProductResolver: ResolveFn<boolean | RedirectCommand> = async (route) => {
  // false: nothing found; the page shows the 404 view in place (resolved-missing.ts).
  const store = inject(Store);
  const onMissing = movedSlugHandler(route);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return false;
  }

  try {
    await firstValueFrom(
      store.dispatch(
        new GetProductBySlug(slug, route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID'),
      ),
    );
    return true;
  } catch (error) {
    return onMissing(error);
  }
};
