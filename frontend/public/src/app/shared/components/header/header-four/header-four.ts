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
import { RouterLink } from '@angular/router';

import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import { HomeCategory } from '../../../../components/home/widgets/home-category/home-category';
import { Wishlist } from '../../../../components/shop/wishlist/wishlist';
import { Option } from '../../../interface/theme-option.interface';
import { LayoutService } from '../../../services/layout.service';
import { MenuService } from '../../../services/menu.service';
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
  selector: 'app-header-four',
  imports: [
    Language,
    Currency,
    SocialMedia,
    TopBarMenu,
    Logo,
    Search,
    UserProfile,
    Wishlist,
    Cart,
    MainMenu,
    HomeCategory,
    RouterLink,
    NgClass,
  ],
  templateUrl: './header-four.html',
  styleUrl: './header-four.scss',
})
export class HeaderFour {
  public isBrowser: boolean;
  public stick: boolean = false;

  menuService = inject(MenuService);

  readonly data = input<Option | null>();
  readonly logo = input<string | null>();
  readonly sticky = input<boolean | number>();

  constructor(public layoutService: LayoutService) {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.isBrowser) {
      let number =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (number >= 50 && window.innerWidth > 400) {
        this.stick = true;
      } else {
        this.stick = false;
      }
    }
  }
  toggleCategories() {
    this.layoutService.headerCategoryCanvasToggle = !this.layoutService.headerCategoryCanvasToggle;
  }

  private offcanvas = inject(NgbOffcanvas);

  @ViewChild('wishlistOffcanvas', { static: false })
  wishlistOffcanvas!: TemplateRef<any>;

  mainMenuOpen() {
    this.menuService.mainMenuToggle = true;
  }

  searchOpen() {
    this.menuService.isOpenSearch = true;
  }

  openWishlist() {
    this.offcanvas.open(this.wishlistOffcanvas, {
      position: 'end',
      panelClass: 'wishlist-offcanvas cart-offcanvas',
    });
  }

  closeWishlist() {
    this.offcanvas.dismiss();
  }
}
