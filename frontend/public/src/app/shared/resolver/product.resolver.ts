import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { GetProductBySlug } from '../store/action/product.action';

export const ProductResolver: ResolveFn<boolean> = async (route) => {
  // false: nothing found; the page shows the 404 view in place (resolved-missing.ts).
  const store = inject(Store);
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
  } catch {
    return false;
  }
};
