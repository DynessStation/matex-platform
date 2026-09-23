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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { combineLatest } from 'rxjs';

import { HomeCategory } from '../../../../components/home/widgets/home-category/home-category';
import { Wishlist } from '../../../../components/shop/wishlist/wishlist';
import { Option } from '../../../interface/theme-option.interface';
import { LayoutService } from '../../../services/layout.service';
import { MenuService } from '../../../services/menu.service';
import { ThemeState } from '../../../store/state/theme.state';
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
  providers: [],
  templateUrl: './header-one.html',
  styleUrl: './header-one.scss',
})
export class HeaderOne {
  public isBrowser = false;
  public stick = false;

  public menuService = inject(MenuService);
  public layoutService = inject(LayoutService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);

  readonly data = input<Option | null>();
  readonly logo = input<string | null>();
  readonly sticky = input<boolean | number>();
  public isGadgetStore = false;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);

    combineLatest([this.route.queryParams, this.store.select(ThemeState.activeTheme)]).subscribe(
      ([params, activeTheme]) => {
        this.isGadgetStore = (params['theme'] || activeTheme) === 'gadget-store';
      },
    );
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.isBrowser) return;

    let y = window.scrollY || 0;
    this.stick = y >= 50 && window.innerWidth > 400;
  }

  toggleCategories() {
    this.layoutService.headerCategoryCanvasToggle = !this.layoutService.headerCategoryCanvasToggle;
  }

  toggleCategoriesOffcanvas() {
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
