import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';

import { GetCategoryBySlug } from '../store/action/category.action';

export const CategoryResolver: ResolveFn<boolean> = async (route) => {
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    console.error('Slug not found in route parameters.');
    return false;
  }

  try {
    const locale = route.routeConfig?.path?.startsWith('en/') ? 'en-US' : 'id-ID';
    await firstValueFrom(store.dispatch(new GetCategoryBySlug(slug, locale)));
    return true;
  } catch (e) {
    return false;
  }
};
