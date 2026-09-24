import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';

import { MenuService } from '../../../../services/menu.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';
import { PublicSearchService } from '../../../../services/public-search.service';

@Component({
  selector: 'app-search',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private router = inject(Router);
  private navigation = inject(PublicNavigationContextService);
  private publicSearch = inject(PublicSearchService);

  public menuService = inject(MenuService);
  public search = new FormControl('', { nonNullable: true });

  readonly results$ = this.search.valueChanges.pipe(
    startWith(''),
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((term) => this.publicSearch.search(term, this.navigation.locale(), 4)),
  );

  get locale(): string {
    return this.navigation.locale();
  }

  get placeholder(): string {
    return this.locale === 'en-US' ? 'Search products and articles...' : 'Cari produk dan artikel...';
  }

  get searchPath(): string {
    return this.locale === 'en-US' ? '/en/search' : '/search';
  }

  productPath(slug: string): string {
    return this.locale === 'en-US' ? `/en/product/${slug}` : `/produk/${slug}`;
  }

  articlePath(slug: string): string {
    return this.locale === 'en-US' ? `/en/article/${slug}` : `/artikel/${slug}`;
  }

  closeSearch() {
    this.menuService.isOpenSearch = false;
  }

  showResults() {
    this.menuService.isOpenSearch = true;
  }

  submitSearch() {
    const term = this.search.value.trim();
    if (term.length < 2) return;
    this.closeSearch();
    void this.router.navigate([this.searchPath], { queryParams: { q: term } });
  }
}
