import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { GetCategoryBySlug } from '../store/action/category.action';

export const CategoryResolver: ResolveFn<boolean> = async (route) => {
  // false: nothing found; the page shows the 404 view in place (resolved-missing.ts).
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return false;
  }

  try {
    const locale = route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID';
    await firstValueFrom(store.dispatch(new GetCategoryBySlug(slug, locale)));
    return true;
  } catch {
    return false;
  }
};
