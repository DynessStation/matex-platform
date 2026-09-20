import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ILicenseKey } from '../../interface/license-key.interface';
import { LicenseKeyService } from '../../services/license-key.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetLicenseKeysAction,
  CreateLicenseKeyAction,
  EditLicenseKeyAction,
  UpdateLicenseKeyAction,
  UpdateLicenseKeyStatusAction,
  DeleteLicenseKeyAction,
  DeleteAllLicenseKeyAction,
} from '../action/license-key.actions';

export class LicenseKeyStateModel {
  licenseKey = {
    data: [] as ILicenseKey[],
    total: 0,
  };
  selectedLicenseKey: ILicenseKey | null;
}

@State<LicenseKeyStateModel>({
  name: 'licenseKey',
  defaults: {
    licenseKey: {
      data: [],
      total: 0,
    },
    selectedLicenseKey: null,
  },
})
@Injectable()
export class LicenseKeysState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private licenseKeyServiceService = inject(LicenseKeyService);

  @Selector()
  static licenseKey(state: LicenseKeyStateModel) {
    return state.licenseKey;
  }

  @Selector()
  static selectedLicenseKey(state: LicenseKeyStateModel) {
    return state.selectedLicenseKey;
  }

  @Action(GetLicenseKeysAction)
  getLicenseKeys(ctx: StateContext<LicenseKeyStateModel>, action: GetLicenseKeysAction) {
    return this.licenseKeyServiceService.getLicenseKeys(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            licenseKey: {
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

  @Action(CreateLicenseKeyAction)
  create(_ctx: StateContext<LicenseKeyStateModel>, _action: CreateLicenseKeyAction) {
    // Create License Key Logic Here
  }

  @Action(EditLicenseKeyAction)
  edit(ctx: StateContext<LicenseKeyStateModel>, { id }: EditLicenseKeyAction) {
    return this.licenseKeyServiceService.getLicenseKeys().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(key => key.id == id);

          ctx.patchState({
            ...state,
            selectedLicenseKey: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateLicenseKeyAction)
  update(
    _ctx: StateContext<LicenseKeyStateModel>,
    { payload: _payload, id: _id }: UpdateLicenseKeyAction,
  ) {
    // Update license key logic here
  }

  @Action(UpdateLicenseKeyStatusAction)
  updateStatus(
    _ctx: StateContext<LicenseKeyStateModel>,
    { id: _id, status: _status }: UpdateLicenseKeyStatusAction,
  ) {
    // Update status license key logic here
  }

  @Action(DeleteLicenseKeyAction)
  delete(_ctx: StateContext<LicenseKeyStateModel>, { id: _id }: DeleteLicenseKeyAction) {
    // Delete license key logic here
  }

  @Action(DeleteAllLicenseKeyAction)
  deleteAll(_ctx: StateContext<LicenseKeyStateModel>, { ids: _ids }: DeleteAllLicenseKeyAction) {
    // Delete all license key logic here
  }
}
