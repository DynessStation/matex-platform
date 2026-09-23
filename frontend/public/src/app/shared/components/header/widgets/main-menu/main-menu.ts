import { AsyncPipe, NgClass, NgTemplateOutlet, SlicePipe } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, inject, input, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { SwiperOptions } from 'swiper/types';

import { LinkBox } from './link-box/link-box';
import { Menu, MenuModel } from '../../../../interface/menu.interface';
import { Product } from '../../../../interface/product.interface';
import { MenuService } from '../../../../services/menu.service';
import { GetMenuProducts } from '../../../../store/action/product.action';
import { MenuState } from '../../../../store/state/menu.state';
import { ProductState } from '../../../../store/state/product.state';
import { NoData } from '../../../no-data/no-data';
import { ProductBox } from '../../../product-box/product-box';

import { IPublicNavigationItem } from '../../../../interface/public-navigation.interface';

@Component({
  selector: 'app-main-menu',
  imports: [
    RouterModule,
    LinkBox,
    ProductBox,
    NoData,
    AsyncPipe,
    NgClass,
    NgTemplateOutlet,
    SlicePipe,
    TranslateModule,
  ],
  templateUrl: './main-menu.html',
  styleUrl: './main-menu.scss',
})
export class MainMenu {
  menu$: Observable<MenuModel> = inject(Store).select(MenuState.menu);
  menuProduct$: Observable<Product[]> = inject(Store).select(ProductState.menuProducts);

  readonly navClass = input<string>();
  readonly items = input<readonly IPublicNavigationItem[] | null>(null);
  private cd = inject(ChangeDetectorRef);

  public menu: Menu[] = [];
  public products: Product[];

  public activeCategory: number = 0;
  public filteredProducts: Product[] = [];

  public menuProductOption: SwiperOptions = {
    slidesPerView: 2,
    spaceBetween: 10,
    speed: 1200,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
  };

  public menuCategoryOption: SwiperOptions = {
    slidesPerView: 4,
    spaceBetween: 12,
    speed: 1200,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
  };

  public categorySwiper: any[] = [];

  constructor(
    private store: Store,
    private router: Router,
    public menuService: MenuService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    if (this.items()) {
      this.menuService.skeletonLoader = false;
      return;
    }
    this.menu$.subscribe((menu) => {
      const productIds = Array.from(new Set(this.concatDynamicProductKeys(menu, 'product_ids')));

      if (!productIds.length) return;

      this.store.dispatch(new GetMenuProducts({ ids: productIds.join() }));

      this.menuProduct$.subscribe((products) => {
        const idSet = new Set(productIds);

        setTimeout(() => {
          this.products = products.filter((p) => idSet.has(p.id));

          const firstCategoryMenu = menu.data.find((m) => m.mega_menu_type === 'category');
          const firstChild = firstCategoryMenu?.child?.[0];

          if (firstChild) {
            setTimeout(() => {
              this.setActiveCategory(0, firstChild);
              (this.cd as ChangeDetectorRef).detectChanges();
            });
          }
          (this.cd as ChangeDetectorRef).detectChanges();
        });
      });
    });
  }

  togglePublicMenu(item: IPublicNavigationItem): void {
    item.active = !item.active;
  }

  setActiveCategory(i: number, megaMenu: Menu) {
    this.activeCategory = i;

    const productIds = megaMenu.product_ids ?? [];
    this.filteredProducts = this.products?.filter((p) => productIds.includes(p.id));
  }

  mainMenuOpen() {
    this.menuService.mainMenuToggle = true;
  }

  mainMenuClose() {
    this.menuService.mainMenuToggle = false;
  }

  redirect(path: string) {
    void this.router.navigateByUrl(path);
  }

  toggle(menu: Menu) {
    if (!menu.active) {
      this.menu.forEach((item) => {
        if (this.menu.includes(menu)) {
          item.active = false;
        }
      });
    }
    menu.active = !menu.active;
  }

  concatDynamicProductKeys(obj: any, keyName: string) {
    const result: number[] = [];
    function traverse(obj: any) {
      for (const key in obj) {
        if (key === keyName && Array.isArray(obj[key])) {
          result.push(...obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key]);
        } else {
          if (key === keyName && obj.product_ids) {
            result.push(obj.product_ids);
          }
        }
      }
    }
    traverse(obj);
    return result;
  }
}
