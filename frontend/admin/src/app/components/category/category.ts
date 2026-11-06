import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { CategoryInsight } from './category-insight/category-insight';
import { FormCategory } from './form-category/form-category';
import { Tree } from './tree/tree';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { InsightToggle } from '../../shared/components/ui/insight/insight-toggle';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ICategoryModel } from '../../shared/interface/category.interface';
import { GetCategoriesAction } from '../../shared/store/action/category.action';
import { CategoryState } from '../../shared/store/state/category.state';

@Component({
  selector: 'app-category',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    HasPermissionDirective,
    PageWrapper,
    FormCategory,
    CategoryInsight,
    InsightToggle,
    Tree,
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  private store = inject(Store);

  readonly insightOpen = signal(true);

  category$: Observable<ICategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<ICategoryModel>;

  readonly type = input<string>('create');
  readonly categoryType = input<string | null>('product');

  ngOnInit(): void {
    this.store.dispatch(new GetCategoriesAction({ type: this.categoryType() }));
  }
}
