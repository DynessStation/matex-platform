import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IValues } from '../../interface/setting.interface';
import { SettingService } from '../../services/setting.service';
import { GetSettingOptionAction } from '../action/setting.action';

export class SettingStateModel {
  setting: IValues | null;
}

@State<SettingStateModel>({
  name: 'setting',
  defaults: {
    setting: null,
  },
})
@Injectable()
export class SettingState {
  private settingService = inject(SettingService);

  @Selector()
  static setting(state: SettingStateModel) {
    return state.setting;
  }

  @Action(GetSettingOptionAction)
  getSettingOptions(ctx: StateContext<SettingStateModel>) {
    return this.settingService.getSettingOption().pipe(
      tap({
        next: (result) => {
          ctx.patchState({
            setting: result.values,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
