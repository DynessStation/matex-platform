import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IStores, IStoresModel } from '../../interface/store.interface';
import { StoreService } from '../../services/store.service';
import { GetStoreBySlugAction, GetStoresAction } from '../action/store.action';

export class StoreStateModel {
  store = {
    data: [] as IStores[],
    total: 0,
  };
  selectedStore: IStores | null;
}

@State<StoreStateModel>({
  name: 'store',
  defaults: {
    store: {
      data: [],
      total: 0,
    },
    selectedStore: null,
  },
})
@Injectable()
export class StoreState {
  private storeService = inject(StoreService);
  private router = inject(Router);

  @Selector()
  static store(state: StoreStateModel) {
    return state.store;
  }

  @Selector()
  static selectedStore(state: StoreStateModel) {
    return state.selectedStore;
  }

  @Action(GetStoresAction)
  getStores(ctx: StateContext<StoreStateModel>, action: GetStoresAction) {
    this.storeService.skeletonLoader = true;
    return this.storeService.getStores(action.payload).pipe(
      tap({
        next: (result: IStoresModel) => {
          let stores = result.data || [];

          stores = result.data.filter(
            (store) =>
              (action?.payload?.['store_slug'] && store?.slug == action?.payload?.['store_slug']) ||
              (action?.payload?.['category'] &&
                store?.categories?.length &&
                store?.categories?.some((category) =>
                  action?.payload?.['category']?.split(',')?.includes(category.slug),
                )),
          );

          if (action?.payload) {
            stores = stores.length ? stores : result.data;

            if (action?.payload?.['sortBy']) {
              if (action?.payload?.['sortBy'] === 'high-to-low') {
                stores = stores.sort((a, b) => {
                  if (a.products_count < b.products_count) {
                    return -1;
                  } else if (a.products_count > b.products_count) {
                    return 1;
                  }
                  return 0;
                });
              } else if (action?.payload?.['sortBy'] === 'low-to-high') {
                stores = stores.sort((a, b) => {
                  if (a.products_count < b.products_count) {
                    return -1;
                  } else if (a.products_count > b.products_count) {
                    return 1;
                  }
                  return 0;
                });
              } else if (action?.payload?.['sortBy'] === 'a-z') {
                stores = stores.sort((a, b) => {
                  if (a.store_name > b.store_name) {
                    return -1;
                  } else if (a.store_name < b.store_name) {
                    return 1;
                  }
                  return 0;
                });
              } else if (action?.payload?.['sortBy'] === 'z-a') {
                stores = stores.sort((a, b) => {
                  if (a.store_name < b.store_name) {
                    return -1;
                  } else if (a.store_name > b.store_name) {
                    return 1;
                  }
                  return 0;
                });
              } else if (action?.payload?.['sortBy'] === 'most-popular') {
                stores = stores.sort((a, b) => {
                  if (a.store_name > b.store_name) {
                    return -1;
                  } else if (a.store_name < b.store_name) {
                    return 1;
                  }
                  return 0;
                });
              }
            } else if (!action?.payload?.['ids']) {
              stores = stores.sort((a, b) => {
                if (a.id < b.id) {
                  return -1;
                } else if (a.id > b.id) {
                  return 1;
                }
                return 0;
              });
            }
          }
          ctx.patchState({
            store: {
              data: stores,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        complete: () => {
          this.storeService.skeletonLoader = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetStoreBySlugAction)
  getStoreBySlug(ctx: StateContext<StoreStateModel>, { slug }: GetStoreBySlugAction) {
    return this.storeService.getStores().pipe(
      tap({
        next: (results) => {
          if (results && results.data) {
            const state = ctx.getState();
            const result = results.data.find((store) => store.slug == slug);

            ctx.patchState({
              ...state,
              selectedStore: result,
            });
          }
        },
        error: (err) => {
          void this.router.navigate(['/404']);
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
