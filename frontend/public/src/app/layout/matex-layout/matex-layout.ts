import { Component, inject, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PublicPageContextService } from '../../shared/services/public-page-context.service';
import { BackToTop } from '../../shared/components/widgets/back-to-top/back-to-top';
import { MatexFooter } from './matex-footer/matex-footer';
import { MatexHeader } from './matex-header/matex-header';

@Component({
  selector: 'app-matex-layout',
  imports: [RouterOutlet, MatexHeader, MatexFooter, BackToTop],
  templateUrl: './matex-layout.html',
  styleUrl: './matex-layout.scss',
})
export class MatexLayout implements OnDestroy {
  private publicPageContext = inject(PublicPageContextService);

  constructor() {
    this.publicPageContext.activate();
  }

  ngOnDestroy(): void {
    this.publicPageContext.deactivate();
  }
}
