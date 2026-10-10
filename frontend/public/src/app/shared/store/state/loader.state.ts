import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import {
  HideButtonSpinnerAction,
  HideLoaderAction,
  ShowButtonSpinnerAction,
  ShowLoaderAction,
} from '../action/loader.action';

export class LoaderStateModel {
  public status?: boolean;
  public loadingCount: number = 0;
  public button_spinner?: boolean;
  public button_id?: string | null;
}

@State<LoaderStateModel>({
  name: 'loader',
  defaults: {
    status: false,
    loadingCount: 0,
    button_spinner: false,
    button_id: null,
  },
})
@Injectable()
export class LoaderState {
  @Selector()
  public static status(state: LoaderStateModel) {
    return state.status;
  }

  @Selector()
  public static loadingCount(state: LoaderStateModel) {
    return state?.loadingCount;
  }

  @Selector()
  public static buttonSpinner(state: LoaderStateModel) {
    return state.button_spinner;
  }

  @Action(ShowLoaderAction)
  public showLoaderAction(ctx: StateContext<LoaderStateModel>, action: ShowLoaderAction) {
    const state = ctx.getState();
    const loadingCount = Math.max(0, state.loadingCount) + 1;
    ctx.patchState({ status: action.loading && loadingCount > 0, loadingCount });
  }

  @Action(HideLoaderAction)
  public hideLoaderAction(ctx: StateContext<LoaderStateModel>) {
    const state = ctx.getState();
    const loadingCount = Math.max(0, state.loadingCount - 1);
    ctx.patchState({
      status: loadingCount > 0,
      loadingCount,
    });
  }

  @Action(ShowButtonSpinnerAction)
  public showButtonSpinnerAction(
    ctx: StateContext<LoaderStateModel>,
    action: ShowButtonSpinnerAction,
  ) {
    const state = ctx.getState();
    ctx.patchState({ ...state, button_spinner: action?.loading });
  }

  @Action(HideButtonSpinnerAction)
  public HideButtonSpinnerAction(ctx: StateContext<LoaderStateModel>) {
    const state = ctx.getState();
    ctx.patchState({ ...state, button_spinner: false });
  }
}
