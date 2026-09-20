import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IAppValues, IValues } from '../../interface/setting.interface';
import { NotificationService } from '../../services/notification.service';
import { SettingService } from '../../services/setting.service';
import {
  GetSettingOptionAction,
  TestEmailAction,
  UpdateAppSettingOptionAction,
  UpdateSettingOptionAction,
} from '../action/setting.action';

export class SettingStateModel {
  setting: IValues | null;
  appSetting: IAppValues | null;
}

@State<SettingStateModel>({
  name: 'setting',
  defaults: {
    setting: null,
    appSetting: null,
  },
})
@Injectable()
export class SettingState {
  private settingService = inject(SettingService);
  private notificationService = inject(NotificationService);

  @Selector()
  static setting(state: SettingStateModel) {
    return state.setting;
  }

  @Selector()
  static appSetting(state: SettingStateModel) {
    return state.appSetting;
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

  @Action(UpdateSettingOptionAction)
  updateSettingOption(
    _ctx: StateContext<SettingStateModel>,
    _action: UpdateSettingOptionAction,
  ) {
    // Update Setting Option Logic Here
  }

  @Action(TestEmailAction)
  TestMailSetting(
    _ctx: StateContext<SettingStateModel>,
    _action: TestEmailAction,
  ) {
    // Mail Testing Logic Here
  }

  @Action(UpdateAppSettingOptionAction)
  UpdateAppSettingOptionAction(
    _ctx: StateContext<SettingStateModel>,
    _action: UpdateAppSettingOptionAction,
  ) {
    // Update App Setting Logic Here
  }
}
