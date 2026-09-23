import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs';

import { BabyShop } from './baby-shop/baby-shop';
import { Electro } from './electro/electro';
import { Gadget } from './gadget/gadget';
import { MegaMart } from './mega-mart/mega-mart';
import { OrganicStore } from './organic-store/organic-store';
import { StyleTech } from './style-tech/style-tech';
import { LayoutService } from '../../shared/services/layout.service';
import { ThemeOptionService } from '../../shared/services/theme-option.service';
import { GetHomePage } from '../../shared/store/action/theme.action';
import { ThemeState } from '../../shared/store/state/theme.state';

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, Gadget, MegaMart, OrganicStore, BabyShop, StyleTech, Electro],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  readonly view$ = combineLatest([
    this.route.queryParamMap.pipe(map((params) => params.get('theme') || '')),
    this.store.select(ThemeState.activeTheme),
  ]).pipe(
    map(([queryTheme, activeTheme]) => queryTheme || activeTheme),
    filter((theme): theme is string => Boolean(theme)),
    distinctUntilChanged(),
    tap(() => this.themeOptionService.preloader.set(true)),
    switchMap((theme) =>
      this.store.dispatch(new GetHomePage(theme)).pipe(
        map(() => ({
          theme,
          homePage: this.store.selectSnapshot(ThemeState.homePage) as any,
        })),
        finalize(() => this.themeOptionService.preloader.set(false)),
      ),
    ),
  );

  constructor(
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
  ) {}
}
