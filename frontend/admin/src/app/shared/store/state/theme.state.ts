import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IThemes } from '../../interface/theme.interface';
import { NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';
import {
  GetHomePageAction,
  GetThemesAction,
  UpdateHomePageAction,
  UpdateThemeAction,
} from '../action/theme.action';

export class ThemesStateModel {
  themes = {
    data: [] as IThemes[],
  };
  homePage: any;
}

@State<ThemesStateModel>({
  name: 'theme',
  defaults: {
    themes: {
      data: [],
    },
    homePage: null,
  },
})
@Injectable()
export class ThemeState {
  private themeService = inject(ThemeService);
  notificationService = inject(NotificationService);

  @Selector()
  static themes(state: ThemesStateModel) {
    return state.themes;
  }

  @Selector()
  static homePage(state: ThemesStateModel) {
    return state.homePage;
  }

  @Action(GetThemesAction)
  getThemes(ctx: StateContext<ThemesStateModel>) {
    return this.themeService.getThemes().pipe(
      tap({
        next: result => {
          ctx.patchState({
            themes: {
              data: result.data,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateThemeAction)
  update(_ctx: StateContext<ThemesStateModel>, { id: _id, status: _status }: UpdateThemeAction) {
    // Update Theme Logic Here
  }

  @Action(GetHomePageAction)
  getHomePage(ctx: StateContext<ThemesStateModel>, action: GetHomePageAction) {
    return this.themeService.getHomePage(action.slug).pipe(
      tap({
        next: result => {
          ctx.patchState({
            homePage: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateHomePageAction)
  updateHomePage(_ctx: StateContext<ThemesStateModel>, _action: UpdateHomePageAction) {
    // Update Home Page Logic Here
  }
}
