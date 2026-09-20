import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { tap } from 'rxjs';

import { IStores } from '../../interface/store.interface';
import { NotificationService } from '../../services/notification.service';
import { StoreService } from '../../services/store.service';
import {
  ApproveStoreStatusAction,
  CreateStoreAction,
  DeleteAllStoreAction,
  DeleteStoreAction,
  EditStoreAction,
  GetStoresAction,
  UpdateStoreAction,
  UpdateStoreStatusAction,
} from '../action/store.action';

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
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private storeService = inject(StoreService);

  @Selector()
  static store(state: StoreStateModel) {
    return state.store;
  }

  @Selector()
  static stores(state: StoreStateModel) {
    return state.store.data.map(store => {
      return { label: store?.store_name, value: store?.id };
    });
  }

  @Selector()
  static selectedStore(state: StoreStateModel) {
    return state.selectedStore;
  }

  @Action(GetStoresAction)
  getStores(ctx: StateContext<StoreStateModel>, action: GetStoresAction) {
    return this.storeService.getStores(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            store: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateStoreAction)
  create(_ctx: StateContext<StoreStateModel>, _action: CreateStoreAction) {
    // Create Store Logic Here
  }

  @Action(EditStoreAction)
  edit(ctx: StateContext<StoreStateModel>, { id }: EditStoreAction) {
    return this.storeService.getStores().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(store => store.id == id);
          ctx.patchState({
            ...state,
            selectedStore: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateStoreAction)
  update(_ctx: StateContext<StoreStateModel>, { payload: _payload, id: _id }: UpdateStoreAction) {
    // Update Store Logic Here
  }

  @Action(UpdateStoreStatusAction)
  updateStatus(
    _ctx: StateContext<StoreStateModel>,
    { id: _id, status: _status }: UpdateStoreStatusAction,
  ) {
    // Update Store Status Logic Here
  }

  @Action(ApproveStoreStatusAction)
  approveStatus(
    _ctx: StateContext<StoreStateModel>,
    { id: _id, status: _status }: ApproveStoreStatusAction,
  ) {
    // Approve Store Status Logic Here
  }

  @Action(DeleteStoreAction)
  delete(_ctx: StateContext<StoreStateModel>, { id: _id }: DeleteStoreAction) {
    // Delete Store Status Logic Here
  }

  @Action(DeleteAllStoreAction)
  deleteAll(_ctx: StateContext<StoreStateModel>, { ids: _ids }: DeleteAllStoreAction) {
    // Delete All Store Status Logic Here
  }
}
