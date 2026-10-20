import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ThemeService } from '../../services/theme.service';
import { GetHomePage } from '../action/theme.action';

// The home page content (layout defaults merged with the published home page).
export class ThemesStateModel {
  homePage: object | null;
}

@State<ThemesStateModel>({
  name: 'theme',
  defaults: {
    homePage: null,
  },
})
@Injectable()
export class ThemeState {
  constructor(private themeService: ThemeService) {}

  @Selector()
  static homePage(state: ThemesStateModel) {
    return state.homePage;
  }

  @Action(GetHomePage)
  getHomePage(ctx: StateContext<ThemesStateModel>, action: GetHomePage) {
    ctx.patchState({ homePage: null });

    return this.themeService.getHomePage(action?.slug, action.locale).pipe(
      tap({
        next: (result) => ctx.patchState({ homePage: result }),
        error: () => ctx.patchState({ homePage: null }),
      }),
    );
  }
}
