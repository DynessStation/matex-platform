import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { debounceTime, distinctUntilChanged, Observable, tap, switchMap } from 'rxjs';

import { Category, CategoryModel } from '../../../../interface/category.interface';
import { Params } from '../../../../interface/core.interface';
import { Product } from '../../../../interface/product.interface';
import { MenuService } from '../../../../services/menu.service';
import { GetCategories, GetSearchByCategory } from '../../../../store/action/category.action';
import { GetProductBySearch } from '../../../../store/action/product.action';
import { CategoryState } from '../../../../store/state/category.state';
import { ProductState } from '../../../../store/state/product.state';
import { ProductBox } from '../../../product-box/product-box';

@Component({
  selector: 'app-search',
  imports: [RouterModule, ProductBox, FormsModule, ReactiveFormsModule, AsyncPipe],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  category$: Observable<CategoryModel> = inject(Store).select(CategoryState.category);
  searchCategory$: Observable<Category[]> = inject(Store).select(CategoryState.searchByCategory);
  productBySearch$: Observable<Product[]> = inject(Store).select(ProductState.productBySearch);

  private store = inject(Store);
  private cd = inject(ChangeDetectorRef);

  public menuService = inject(MenuService);

  public isCategoryOpen = false;
  public isResultOpen = false;

  public search = new FormControl();
  public filter: Params = {
    page: 1, // Current page number
    paginate: 4, // Display per page,
    status: 1,
    search: '',
  };

  constructor() {
    this.store.dispatch(new GetCategories());
    this.store.dispatch(new GetSearchByCategory());
    this.store.dispatch(new GetProductBySearch(this.filter));
  }

  public selectedCategory = 'All Category';

  closeSearch() {
    this.menuService.isOpenSearch = false;
  }

  toggleCategory() {
    this.isCategoryOpen = !this.isCategoryOpen;
  }

  selectCategory(cat: string) {
    setTimeout(() => {
      this.selectedCategory = cat;
      this.isCategoryOpen = false;
    });
  }

  showResults() {
    this.menuService.isOpenSearch = true;
  }

  hideResults() {
    setTimeout(() => {
      this.menuService.isOpenSearch = false;
    }, 100);
  }

  ngOnInit() {
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe((inputValue: string) => {
        this.filter['search'] = inputValue;
        this.store.dispatch(
          new GetSearchByCategory({ status: 1, paginate: 4, search: inputValue }),
        );
        this.store.dispatch(new GetProductBySearch(this.filter));
      });
  }
}
