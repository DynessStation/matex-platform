import { isPlatformBrowser, NgClass } from '@angular/common';
import { Component, HostListener, inject, input, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Option } from '../../../interface/theme-option.interface';
import { MenuService } from '../../../services/menu.service';
import { Language } from '../widgets/language/language';
import { Logo } from '../widgets/logo/logo';
import { MainMenu } from '../widgets/main-menu/main-menu';
import { Search } from '../widgets/search/search';
import { TopBarMenu } from '../widgets/top-bar-menu/top-bar-menu';
import { PublicNavigationContextService } from '../../../services/public-navigation-context.service';

@Component({
  selector: 'app-header-one',
  standalone: true,
  imports: [
    Language,
    TopBarMenu,
    Logo,
    Search,
    MainMenu,
    NgClass,
    RouterLink,
  ],
  providers: [],
  templateUrl: './header-one.html',
  styleUrl: './header-one.scss',
})
export class HeaderOne {
  public isBrowser = false;
  public stick = false;

  public menuService = inject(MenuService);
  public navigation = inject(PublicNavigationContextService);

  readonly data = input<Option | null>();
  readonly logo = input<string | null>();
  readonly sticky = input<boolean | number>();
  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.isBrowser) return;

    let y = window.scrollY || 0;
    this.stick = y >= 50 && window.innerWidth > 400;
  }

  mainMenuOpen() {
    this.menuService.mainMenuToggle = true;
  }

  searchOpen() {
    this.menuService.isOpenSearch = true;
  }

  get catalogPath(): string {
    return this.navigation.locale() === 'en-US' ? '/en/catalog' : '/katalog';
  }

  get catalogLabel(): string {
    return this.navigation.locale() === 'en-US' ? 'Product Catalog' : 'Katalog Produk';
  }
}
