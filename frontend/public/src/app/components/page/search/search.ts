import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { debounceTime, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { PublicSearchService } from '../../../shared/services/public-search.service';

@Component({
  selector: 'app-search-page',
  imports: [AsyncPipe, Breadcrumb, ReactiveFormsModule, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private publicSearch = inject(PublicSearchService);
  public navigation = inject(PublicNavigationContextService);

  public search = new FormControl('', { nonNullable: true });
  public breadcrumb: breadcrumb = { title: '', items: [] };

  readonly results$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? params.get('search') ?? '').trim()),
    distinctUntilChanged(),
    switchMap((term) => this.publicSearch.search(term, this.navigation.locale(), 24)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.search.setValue(params.get('q') ?? params.get('search') ?? '', { emitEvent: false });
      this.setBreadcrumb();
    });

    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: term.trim() || null, search: null, page: null, paginate: null },
          queryParamsHandling: 'merge',
        });
      });
  }

  get locale(): string {
    return this.navigation.locale();
  }

  get placeholder(): string {
    return this.locale === 'en-US' ? 'Search products and articles' : 'Cari produk dan artikel';
  }

  productPath(slug: string): string {
    return this.locale === 'en-US' ? `/en/product/${slug}` : `/produk/${slug}`;
  }

  articlePath(slug: string): string {
    return this.locale === 'en-US' ? `/en/article/${slug}` : `/artikel/${slug}`;
  }

  imageUrl(item: { asset_url?: string; original_url?: string } | null | undefined): string {
    return item?.asset_url || item?.original_url || 'assets/images/placeholder/1.png';
  }

  private setBreadcrumb() {
    const title = this.locale === 'en-US' ? 'Search' : 'Pencarian';
    this.breadcrumb = { title, items: [{ label: title, active: true }] };
  }
}
