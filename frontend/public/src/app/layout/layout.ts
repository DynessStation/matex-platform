import { Component, inject, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '../shared/components/footer/footer';
import { HeaderOne } from '../shared/components/header/header-one/header-one';
import { BackToTop } from '../shared/components/widgets/back-to-top/back-to-top';
import { PublicPageContextService } from '../shared/services/public-page-context.service';

@Component({
  selector: 'app-layout',
  imports: [HeaderOne, RouterOutlet, Footer, BackToTop],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnDestroy {
  private publicPageContext = inject(PublicPageContextService);

  constructor() {
    this.publicPageContext.activate();
  }

  ngOnDestroy(): void {
    this.publicPageContext.deactivate();
  }
}
