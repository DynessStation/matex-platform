import { AsyncPipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Store } from '@ngxs/store';

import { Footer } from '../../shared/components/footer/footer';
import { Header } from '../../shared/components/header/header';
import { BackToTop } from '../../shared/components/widgets/back-to-top/back-to-top';

import { GetCurrencies } from '../../shared/store/action/currency.action';
import { GetMenu } from '../../shared/store/action/menu.action';
import { GetSettingOption } from '../../shared/store/action/setting.action';
import { ThemeOptions } from '../../shared/store/action/theme-option.action';
import { GetThemes } from '../../shared/store/action/theme.action';

import { ThemeOptionState } from '../../shared/store/state/theme-option.state';

import { PublicPageContextService } from '../../shared/services/public-page-context.service';

@Component({
  selector: 'app-matex-layout',
  imports: [AsyncPipe, RouterOutlet, Header, Footer, BackToTop],
  templateUrl: './matex-layout.html',
  styleUrl: './matex-layout.scss',
})
export class MatexLayout implements OnDestroy {
  private store = inject(Store);
  private publicPageContext = inject(PublicPageContextService);

  themeOption$ = this.store.select(ThemeOptionState.themeOptions);

  constructor() {
    this.publicPageContext.activate();

    this.store.dispatch(new GetThemes());
    this.store.dispatch(new GetCurrencies({ status: 1 }));
    this.store.dispatch(new GetSettingOption());
    this.store.dispatch(new ThemeOptions());
    this.store.dispatch(new GetMenu());
  }

  ngOnDestroy(): void {
    this.publicPageContext.deactivate();
  }
}
