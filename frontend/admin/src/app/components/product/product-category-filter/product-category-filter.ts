import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Store } from '@ngxs/store';

import { ICategory } from '../../../shared/interface/category.interface';
import { GetCategoriesAction } from '../../../shared/store/action/category.action';
import { CategoryState } from '../../../shared/store/state/category.state';

// Category panel beside the product list (U-13, D-6): "Semua produk" and every category with
// its product count; a click filters the list (the page keeps the choice in the URL). The
// search narrows the tree and keeps the parents of matches.
@Component({
  selector: 'app-product-category-filter',
  imports: [NgTemplateOutlet],
  templateUrl: './product-category-filter.html',
})
export class ProductCategoryFilter {
  private store = inject(Store);

  /** Selected category id; empty for every product. */
  readonly selected = input('');

  /** Products in the whole list, shown next to "Semua produk". */
  readonly totalAll = input<number | null | undefined>(null);

  readonly selectCategory = output<string>();

  readonly search = signal('');

  private readonly model = toSignal(this.store.select(CategoryState.category));

  readonly categories = computed(() =>
    this.filterTree(
      this.model()?.data ?? [],
      this.search().trim().toLowerCase(),
    ),
  );

  ngOnInit(): void {
    this.store.dispatch(new GetCategoriesAction({ type: 'product' }));
  }

  choose(id: string): void {
    if (id !== this.selected()) this.selectCategory.emit(id);
  }

  private filterTree(items: ICategory[], query: string): ICategory[] {
    if (!query) return items;
    const result: ICategory[] = [];
    for (const item of items) {
      const subcategories = this.filterTree(item.subcategories ?? [], query);
      if (item.name.toLowerCase().includes(query) || subcategories.length) {
        result.push({ ...item, subcategories });
      }
    }
    return result;
  }
}
