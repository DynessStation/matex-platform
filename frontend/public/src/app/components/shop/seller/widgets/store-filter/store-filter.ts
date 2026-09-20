import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { StoreCategory } from './store-category/store-category';
import { StoreRating } from './store-rating/store-rating';
import { Params } from '../../../../../shared/interface/core.interface';
import { TextConverterPipe } from '../../../../../shared/pipe/text-converter.pipe';

@Component({
  selector: 'app-store-filter',
  imports: [TextConverterPipe, NgbModule, StoreCategory, StoreRating],
  templateUrl: './store-filter.html',
  styleUrl: './store-filter.scss',
})
export class StoreFilter {
  filter = input<Params>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public filters: string[];

  public filtersObj: { [key: string]: string[] } = {
    category: [],
    rating: [],
  };

  ngOnChanges() {
    this.filtersObj = {
      category: this.splitFilter('category'),
      rating: this.splitFilter('rating'),
    };

    this.filters = this.mergeFilters();
  }

  remove(tag: string) {
    Object.keys(this.filtersObj).forEach((key) => {
      this.filtersObj[key] = this.filtersObj[key].filter((val: string) => {
        if (key === 'rating') {
          return val !== tag.replace(/^rating /, '');
        }
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
    const filter = this.filter();
    return filter && filter[filterKey] ? filter[filterKey].split(',') : [];
  }

  private mergeFilters(): string[] {
    return [
      ...this.filtersObj['category'],
      ...this.filtersObj['rating'].map((val) =>
        val.startsWith('rating ') ? val : `rating ${val}`,
      ),
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
