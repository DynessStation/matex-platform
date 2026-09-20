import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Params } from '../../../../shared/interface/core.interface';
import { Option } from '../../../../shared/interface/theme-option.interface';
import { LayoutService } from '../../../../shared/services/layout.service';
import { ThemeOptionState } from '../../../../shared/store/state/theme-option.state';
import { CollectionProducts } from '../widgets/collection-products/collection-products';
import { Sidebar } from '../widgets/sidebar/sidebar';

@Component({
  selector: 'app-collection-product-infinite-scroll',
  imports: [Sidebar, CollectionProducts],
  templateUrl: './collection-product-infinite-scroll.html',
  styleUrl: './collection-product-infinite-scroll.scss',
})
export class CollectionProductInfiniteScroll {
  filter = input<Params>();
  layoutService = inject(LayoutService);

  public bannerImageUrl: string;

  private store = inject(Store);
  themeOptions$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);

  constructor() {
    this.themeOptions$.subscribe(
      (res) => (this.bannerImageUrl = res?.collection?.collection_banner_image_url),
    );
  }
}
