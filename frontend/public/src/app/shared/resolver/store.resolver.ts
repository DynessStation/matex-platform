import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { GetStoreBySlugAction } from '../store/action/store.action';

export const StoreResolver: ResolveFn<Observable<unknown>> = (route, _state) => {
  const store = inject(Store);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    throw new Error('Slug parameter is missing');
  }

  return store.dispatch(new GetStoreBySlugAction(slug));
};
