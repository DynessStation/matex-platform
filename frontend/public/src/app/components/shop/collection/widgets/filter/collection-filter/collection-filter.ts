import { Component, input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Params } from '../../../../../../shared/interface/core.interface';
import { TextConverterPipe } from '../../../../../../shared/pipe/text-converter.pipe';

@Component({
  selector: 'app-collection-filter',
  standalone: true,
  imports: [RouterModule, TextConverterPipe],
  templateUrl: './collection-filter.html',
  styleUrl: './collection-filter.scss',
})
export class CollectionFilterComponent {
  filter = input<Params>();

  public filters: string[];

  public filtersObj: { [key: string]: string[] } = {
    category: [],
    brand: [],
    tag: [],
    price: [],
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnChanges() {
    this.filtersObj = {
      category: this.splitFilter('category'),
      brand: this.splitFilter('brand'),
      tag: this.splitFilter('tag'),
      price: this.splitFilter('price'),
    };

    this.filters = this.mergeFilters();
  }

  remove(tag: string) {
    Object.keys(this.filtersObj).forEach((key) => {
      this.filtersObj[key] = this.filtersObj[key].filter((val: string) => {
        return val !== tag;
      });
    });

    this.filters = this.mergeFilters();

    const params: Params = {};
    Object.keys(this.filtersObj).forEach((key) => {
      params[key] = this.filtersObj[key].length ? this.filtersObj[key]?.join(',') : null;
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      skipLocationChange: false,
    });
  }

  clear() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: null,
      skipLocationChange: false,
    });
  }

  private splitFilter(filterKey: keyof Params): string[] {
    return this.filter && this.filter()![filterKey] ? this.filter()![filterKey].split(',') : [];
  }

  private mergeFilters(): string[] {
    return [
      ...this.filtersObj['category'],
      ...this.filtersObj['brand'],
      ...this.filtersObj['tag'],
      ...this.filtersObj['price'],
    ];
  }

  formatFilters(filters: string): string {
    if (!filters) return ''; // Handle edge cases like empty or undefined filters

    return filters
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
