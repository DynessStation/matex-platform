import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Params } from '../../../../shared/interface/core.interface';
import { Option } from '../../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../../shared/store/state/theme-option.state';
import { CollectionProducts } from '../widgets/collection-products/collection-products';

@Component({
  selector: 'app-collection-no-sidebar',
  imports: [CollectionProducts],
  templateUrl: './collection-no-sidebar.html',
  styleUrl: './collection-no-sidebar.scss',
})
export class CollectionNoSidebar {
  filter = input<Params>();

  public bannerImageUrl: string;

  private store = inject(Store);
  themeOptions$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);

  constructor() {
    this.themeOptions$.subscribe(
      (res) => (this.bannerImageUrl = res?.collection?.collection_banner_image_url),
    );
  }
}
