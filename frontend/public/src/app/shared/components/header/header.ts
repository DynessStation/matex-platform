import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Store } from '@ngxs/store';

import { HeaderOne } from './header-one/header-one';
import { BodyService } from '../../services/body.service';
import { MobileMenu } from './widgets/mobile-menu/mobile-menu';
import { ThemeOptionState } from '../../store/state/theme-option.state';

// The site header. MATEX uses one header layout; the other Kartify demo headers were removed
// in 6B (they could be switched on with ?theme=, FE-011).
@Component({
  selector: 'app-header',
  imports: [HeaderOne, MobileMenu, AsyncPipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  themeOption$ = this.store.select(ThemeOptionState.themeOptions);

  readonly logo = input<string>();

  public sticky = true;

  constructor(public bodyService: BodyService) {
    this.bodyService.addClass('base-bg-color');
    this.themeOption$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((option) => (this.sticky = option?.header?.sticky_header_enable ?? true));
  }
}
