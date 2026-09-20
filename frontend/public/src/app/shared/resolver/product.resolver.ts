import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';

import { GetProductBySlug } from '../store/action/product.action';

export const ProductResolver: ResolveFn<boolean> = (route) => {
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    console.error('Slug not found in route parameters.');
    return Promise.resolve(false);
  }

  return store
    .dispatch(new GetProductBySlug(slug))
    .toPromise()
    .then(() => true)
    .catch(() => false);
};
