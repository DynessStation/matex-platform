import { isPlatformBrowser, NgClass } from '@angular/common';
import {
  Component,
  HostListener,
  inject,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import { HomeCategory } from '../../../../components/home/widgets/home-category/home-category';
import { Wishlist } from '../../../../components/shop/wishlist/wishlist';
import { LayoutService } from '../../../services/layout.service';
import { MenuService } from '../../../services/menu.service';
import { PublicNavigationContextService } from '../../../services/public-navigation-context.service';
import { Cart } from '../widgets/cart/cart';
import { Currency } from '../widgets/currency/currency';
import { Language } from '../widgets/language/language';
import { Logo } from '../widgets/logo/logo';
import { MainMenu } from '../widgets/main-menu/main-menu';
import { Search } from '../widgets/search/search';
import { SocialMedia } from '../widgets/social-media/social-media';
import { TopBarMenu } from '../widgets/top-bar-menu/top-bar-menu';
import { UserProfile } from '../widgets/user-profile/user-profile';

@Component({
  selector: 'app-header-one',
  standalone: true,
  imports: [
    Language,
    Currency,
    SocialMedia,
    TopBarMenu,
    Logo,
    Search,
    MainMenu,
    Cart,
    Wishlist,
    UserProfile,
    RouterLink,
    NgClass,
    HomeCategory,
  ],
  templateUrl: './header-one.html',
  styleUrl: './header-one.scss',
})
export class HeaderOne {
  readonly navigation = inject(PublicNavigationContextService);
  readonly menuService = inject(MenuService);
  readonly layoutService = inject(LayoutService);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly offcanvas = inject(NgbOffcanvas);

  stick = false;

  @ViewChild('wishlistOffcanvas', { static: false })
  wishlistOffcanvas!: TemplateRef<unknown>;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.isBrowser) return;

    this.stick = window.scrollY >= 50 && window.innerWidth > 400;
  }

  toggleCategories(): void {
    this.layoutService.headerCategoryCanvasToggle = !this.layoutService.headerCategoryCanvasToggle;
  }

  mainMenuOpen(): void {
    this.menuService.mainMenuToggle = true;
  }

  searchOpen(): void {
    this.menuService.isOpenSearch = true;
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
}
