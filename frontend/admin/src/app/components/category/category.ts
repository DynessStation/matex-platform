import { CommonModule } from '@angular/common';
import { Component, inject, viewChild, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { FormCategory } from './form-category/form-category';
import { Tree } from './tree/tree';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { ImportCsvModal } from '../../shared/components/ui/modal/import-csv-modal/import-csv-modal';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { ICategoryModel } from '../../shared/interface/category.interface';
import {
  ExportCategoryAction,
  GetCategoriesAction,
} from '../../shared/store/action/category.action';
import { CategoryState } from '../../shared/store/state/category.state';

@Component({
  selector: 'app-category',
  imports: [
    CommonModule,
    TranslateModule,
    HasPermissionDirective,
    NgbModule,
    PageWrapper,
    FormCategory,
    Tree,
    ImportCsvModal,
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  private store = inject(Store);
  private router = inject(Router);

  category$: Observable<ICategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<ICategoryModel>;

  readonly CSVModal = viewChild<ImportCsvModal>('csvModal');

  readonly type = input<string>('create');
  readonly categoryType = input<string | null>('product');

  ngOnInit(): void {
    this.store.dispatch(new GetCategoriesAction({ type: this.categoryType() }));
  }

  export() {
    this.store.dispatch(new ExportCategoryAction());
  }

  create(type: string) {
    void this.router.navigate([type == 'post' ? '/blog/category' : '/category']);
  }
}
