import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Store } from '@ngxs/store';

import { Footer } from '../shared/components/footer/footer';
import { HeaderOne } from '../shared/components/header/header-one/header-one';
import { BackToTop } from '../shared/components/widgets/back-to-top/back-to-top';
import { PublicPageContextService } from '../shared/services/public-page-context.service';
import { GetMenu } from '../shared/store/action/menu.action';
import { ThemeOptions } from '../shared/store/action/theme-option.action';

@Component({
  selector: 'app-layout',
  imports: [HeaderOne, RouterOutlet, Footer, BackToTop],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit, OnDestroy {
  private publicPageContext = inject(PublicPageContextService);
  private store = inject(Store);

  constructor() {
    this.publicPageContext.activate();
  }

  ngOnInit(): void {
    this.store.dispatch([new ThemeOptions(), new GetMenu()]);
  }

  ngOnDestroy(): void {
    this.publicPageContext.deactivate();
  }
}
