import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { forkJoin, of } from 'rxjs';

import { Button } from '../../../shared/components/button/button';
import { Timer } from '../../../shared/components/widgets/timer/timer';
import { GadgetTheme } from '../../../shared/interface/theme.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { GetCategories } from '../../../shared/store/action/category.action';
import { GetProductByIds } from '../../../shared/store/action/product.action';
import { GetTags } from '../../../shared/store/action/tag.action';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeCategory } from '../widgets/home-category/home-category';
import { HomeDealProducts } from '../widgets/home-deal-products/home-deal-products';
import { HomeNewsletter } from '../widgets/home-newsletter/home-newsletter';
import { HomeProduct } from '../widgets/home-product/home-product';
import { HomeTabsProducts } from '../widgets/home-tabs-products/home-tabs-products';
import { HomeTags } from '../widgets/home-tags/home-tags';
import { HomeTopCategoryProduct } from '../widgets/home-top-category-product/home-top-category-product';

@Component({
  selector: 'app-gadget',
  imports: [
    HomeBanner,
    HomeProduct,
    HomeTopCategoryProduct,
    HomeCategory,
    HomeTabsProducts,
    HomeTags,
    HomeNewsletter,
    HomeDealProducts,
    Timer,
    Button,
    NgClass,
  ],
  templateUrl: './gadget.html',
  styleUrl: './gadget.scss',
})
export class Gadget {
  data = input<GadgetTheme>();
  slug = input<string>();

  constructor(
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
    private store: Store,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.data()?.slug === this.slug()) {
      // Get Products
      let getProducts$;
      if (this.data()?.products_ids?.length) {
        getProducts$ = this.store.dispatch(
          new GetProductByIds({
            status: 1,
            approve: 1,
            ids: this.data()?.products_ids?.join(','),
            paginate: this.data()?.products_ids?.length,
          }),
        );
      } else {
        getProducts$ = of(null);
      }

      // Get Category
      let getCategory$;
      if (this.data()?.categories?.category_ids?.length && this.data()?.categories?.status) {
        getCategory$ = this.store.dispatch(
          new GetCategories({
            status: 1,
            ids: this.data()?.categories?.category_ids?.join(','),
          }),
        );
      } else {
        getCategory$ = of(null);
      }

      // Get Tags
      let getTag$;
      if (this.data()?.tags?.tags_ids?.length && this.data()?.tags?.status) {
        getTag$ = this.store.dispatch(
          new GetTags({
            status: 1,
            ids: this.data()?.tags?.tags_ids?.join(','),
          }),
        );
      } else {
        getTag$ = of(null);
      }

      // Skeleton Loader
      forkJoin([getProducts$, getCategory$, getTag$]).subscribe({
        complete: () => {
          this.themeOptionService.preloader.set(false);
          this.cdr.markForCheck();
        },
      });
    }
  }
}
