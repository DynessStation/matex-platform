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
    await firstValueFrom(store.dispatch(new GetCategoryBySlug(slug)));
    return true;
  } catch (e) {
    return false;
  }
};
