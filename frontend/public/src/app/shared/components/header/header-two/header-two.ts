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
import { Logo } from '../widgets/logo/logo';
import { MainMenu } from '../widgets/main-menu/main-menu';
import { Search } from '../widgets/search/search';
import { UserProfile } from '../widgets/user-profile/user-profile';

@Component({
  selector: 'app-header-two',
  imports: [MainMenu, Wishlist, Cart, Search, Logo, UserProfile, HomeCategory, RouterLink, NgClass],
  templateUrl: './header-two.html',
  styleUrl: './header-two.scss',
})
export class HeaderTwo {
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

  mainMenuOpen() {
    this.menuService.mainMenuToggle = true;
  }

  searchOpen() {
    this.menuService.isOpenSearch = true;
  }

  private offcanvas = inject(NgbOffcanvas);
  public showHeaderBanner: boolean = true;

  @ViewChild('wishlistOffcanvas', { static: false })
  wishlistOffcanvas!: TemplateRef<any>;

  removeHeaderBanner() {
    this.showHeaderBanner = false;
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
