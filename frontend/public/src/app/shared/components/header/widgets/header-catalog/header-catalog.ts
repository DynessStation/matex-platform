import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, of, shareReplay, switchMap } from 'rxjs';

import { Category } from '../../../../interface/category.interface';
import { CategoryService } from '../../../../services/category.service';
import { LayoutService } from '../../../../services/layout.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-header-catalog',
  imports: [AsyncPipe, NgTemplateOutlet, RouterLink],
  templateUrl: './header-catalog.html',
  styleUrl: './header-catalog.scss',
})
export class HeaderCatalog {
  private categoryService = inject(CategoryService);
  public layoutService = inject(LayoutService);
  public navigation = inject(PublicNavigationContextService);

  readonly categories$ = this.navigation.locale$.pipe(
    switchMap(() =>
      this.categoryService
        .getCategories({ status: 1 })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  categoryPath(category: Category): string {
    return this.navigation.locale() === 'en-US'
      ? `/en/category/${category.slug}`
      : `/kategori/${category.slug}`;
  }

  catalogPath(): string {
    return this.navigation.locale() === 'en-US' ? '/en/catalog' : '/katalog';
  }

  close(): void {
    this.layoutService.headerCategoryCanvasToggle = false;
  }
}
