import { Component, inject, input } from '@angular/core';

import { Params } from '../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../shared/services/layout.service';
import { CollectionCategories } from '../widgets/collection-categories/collection-categories';
import { CollectionProducts } from '../widgets/collection-products/collection-products';
import { Sidebar } from '../widgets/sidebar/sidebar';

@Component({
  selector: 'app-collection-list',
  imports: [Sidebar, CollectionProducts, CollectionCategories],
  templateUrl: './collection-list.html',
  styleUrl: './collection-list.scss',
})
export class CollectionList {
  filter = input<Params>();
  layoutService = inject(LayoutService);
}
