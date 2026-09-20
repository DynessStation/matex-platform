import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Category, CategoryModel } from '../../../../../../shared/interface/category.interface';
import { Params } from '../../../../../../shared/interface/core.interface';
import { SearchFilterPipe } from '../../../../../../shared/pipe/search-filter.pipe';
import { GetCategories } from '../../../../../../shared/store/action/category.action';
import { CategoryState } from '../../../../../../shared/store/state/category.state';

@Component({
  selector: 'app-store-category',
  imports: [FormsModule, SearchFilterPipe],
  templateUrl: './store-category.html',
  styleUrl: './store-category.scss',
})
export class StoreCategory {
  filter = input<Params>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);

  category$: Observable<CategoryModel> = inject(Store).select(CategoryState.category);

  public categories: Category[];
  public selectedCategories: string[] = [];
  public searchText: string = '';

  constructor() {
    this.store.dispatch(new GetCategories());
  }

  ngOnInit() {
    this.category$.subscribe((res) => {
      this.categories = res.data.filter((category) => category.type == 'product');
    });
  }

  ngOnChanges() {
    const filter = this.filter();
    this.selectedCategories = filter!['category'] ? filter!['category'].split(',') : [];
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
