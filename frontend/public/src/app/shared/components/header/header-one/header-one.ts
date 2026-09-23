import { isPlatformBrowser, NgClass } from '@angular/common';
import { Component, HostListener, inject, PLATFORM_ID } from '@angular/core';

import { MenuService } from '../../../services/menu.service';
import { PublicNavigationContextService } from '../../../services/public-navigation-context.service';
import { Language } from '../widgets/language/language';
import { Logo } from '../widgets/logo/logo';
import { MainMenu } from '../widgets/main-menu/main-menu';

@Component({
  selector: 'app-header-one',
  standalone: true,
  imports: [Language, Logo, MainMenu, NgClass],
  templateUrl: './header-one.html',
  styleUrl: './header-one.scss',
})
export class HeaderOne {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly menuService = inject(MenuService);
  readonly navigation = inject(PublicNavigationContextService);

  stick = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.isBrowser) return;

    this.stick = window.scrollY >= 50 && window.innerWidth > 400;
  }

  mainMenuOpen(): void {
    this.menuService.mainMenuToggle = true;
  }
}
