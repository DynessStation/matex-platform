import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IOption, IThemeOption } from '../../interface/theme-option.interface';
import { NotificationService } from '../../services/notification.service';
import { ThemeOptionService } from '../../services/theme-option.service';
import { GetThemeOptionAction, UpdateThemeOptionAction } from '../action/theme-option.action';

export class ThemeOptionStateModel {
  theme_option: IOption | null;
}

@State<ThemeOptionStateModel>({
  name: 'theme_option',
  defaults: {
    theme_option: null,
  },
})
@Injectable()
export class ThemeOptionState {
  private themeOptionService = inject(ThemeOptionService);
  notificationService = inject(NotificationService);

  @Selector()
  static themeOptions(state: ThemeOptionStateModel) {
    return state.theme_option;
  }

  @Action(GetThemeOptionAction)
  getThemeOptions(ctx: StateContext<ThemeOptionStateModel>) {
    return this.themeOptionService.getThemeOption().pipe(
      tap({
        next: (result: IThemeOption) => {
          ctx.patchState({
            theme_option: result.options,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateThemeOptionAction)
  UpdateThemeOption(_ctx: StateContext<ThemeOptionStateModel>, _action: UpdateThemeOptionAction) {
    // Update Theme Option Logic Here
  }
}
