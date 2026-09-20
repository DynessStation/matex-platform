import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { map, Observable } from 'rxjs';

import { NoData } from '../../../../../../shared/components/no-data/no-data';
import { Category, CategoryModel } from '../../../../../../shared/interface/category.interface';
import { Params } from '../../../../../../shared/interface/core.interface';
import { SearchFilterPipe } from '../../../../../../shared/pipe/search-filter.pipe';
import { GetCategories } from '../../../../../../shared/store/action/category.action';
import { CategoryState } from '../../../../../../shared/store/state/category.state';

@Component({
  selector: 'app-collection-category-filter',
  standalone: true,
  imports: [FormsModule, SearchFilterPipe, NoData, NgTemplateOutlet, AsyncPipe],
  templateUrl: './collection-category-filter.html',
  styleUrl: './collection-category-filter.scss',
})
export class CollectionCategoryFilter {
  private store = inject(Store);
  category$: Observable<CategoryModel> = this.store.select(CategoryState.category);
  public filteredCategories$: Observable<Category[]> = this.category$.pipe(
    map((res) => res?.data?.filter((category) => category.type == 'product') || []),
  );

  filter = input<Params>();

  public selectedCategories: string[] = [];
  public searchText: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.store.dispatch(new GetCategories());
  }

  ngOnInit() {
  }

  ngOnChanges() {
    this.selectedCategories = this.filter()!['category']
      ? this.filter()!['category'].split(',')
      : [];
  }

  applyFilter(event: Event) {
    const index = this.selectedCategories.indexOf((<HTMLInputElement>event?.target)?.value); // checked and unchecked value

    if ((<HTMLInputElement>event?.target)?.checked)
      this.selectedCategories.push((<HTMLInputElement>event?.target)?.value); // push in array cheked value
    else this.selectedCategories.splice(index, 1); // removed in array unchecked value

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategories.length ? this.selectedCategories?.join(',') : null,
        page: 1,
      },
      queryParamsHandling: 'merge', // preserve the existing query params in the route
      skipLocationChange: false, // do trigger navigation
    });
  }

  // check if the item are selected
  checked(item: string) {
    if (this.selectedCategories?.indexOf(item) != -1) {
      return true;
    }
    return false;
  }
}
