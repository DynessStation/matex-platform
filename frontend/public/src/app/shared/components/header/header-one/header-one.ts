import { isPlatformBrowser, NgClass } from '@angular/common';
import {
  Component,
  HostListener,
  inject,
  input,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { Option } from '../../../interface/theme-option.interface';
import { LayoutService } from '../../../services/layout.service';
import { MenuService } from '../../../services/menu.service';
import { Wishlist } from '../../../../components/shop/wishlist/wishlist';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { Cart } from '../widgets/cart/cart';
import { HeaderCatalog } from '../widgets/header-catalog/header-catalog';
import { Language } from '../widgets/language/language';
import { Logo } from '../widgets/logo/logo';
import { MainMenu } from '../widgets/main-menu/main-menu';
import { Search } from '../widgets/search/search';
import { PublicNavigationContextService } from '../../../services/public-navigation-context.service';
import { UserProfile } from '../widgets/user-profile/user-profile';

@Component({
  selector: 'app-header-one',
  standalone: true,
  imports: [Language, Logo, Search, MainMenu, HeaderCatalog, Wishlist, UserProfile, Cart, NgClass],
  providers: [],
  templateUrl: './header-one.html',
  styleUrl: './header-one.scss',
})
export class HeaderOne {
  public isBrowser = false;
  public stick = false;

  public menuService = inject(MenuService);
  public navigation = inject(PublicNavigationContextService);
  public layoutService = inject(LayoutService);
  private offcanvas = inject(NgbOffcanvas);

  @ViewChild('wishlistOffcanvas', { static: false })
  wishlistOffcanvas!: TemplateRef<unknown>;

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

  toggleCategories(): void {
    this.layoutService.headerCategoryCanvasToggle = !this.layoutService.headerCategoryCanvasToggle;
  }

  openWishlist(): void {
    this.offcanvas.open(this.wishlistOffcanvas, {
      position: 'end',
      panelClass: 'wishlist-offcanvas cart-offcanvas',
    });
  }

  closeWishlist(): void {
    this.offcanvas.dismiss();
  }

  get catalogLabel(): string {
    return this.navigation.locale() === 'en-US' ? 'Product Catalog' : 'Katalog Produk';
  }
}
