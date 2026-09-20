import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ICategory } from '../../interface/category.interface';
import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetCategoriesAction,
  CreateCategoryAction,
  EditCategoryAction,
  UpdateCategoryAction,
  DeleteCategoryAction,
  ExportCategoryAction,
  ImportCategoryAction,
} from '../action/category.action';

export class CategoryStateModel {
  category = {
    data: [] as ICategory[],
    total: 0,
  };
  selectedCategory: ICategory | null;
}

@State<CategoryStateModel>({
  name: 'category',
  defaults: {
    category: {
      data: [],
      total: 0,
    },
    selectedCategory: null,
  },
})
@Injectable()
export class CategoryState {
  private store = inject(Store);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private categoryService = inject(CategoryService);

  @Selector()
  static category(state: CategoryStateModel) {
    return state.category;
  }

  @Selector()
  static categories(state: CategoryStateModel) {
    return state.category.data.map(res => {
      return {
        label: res?.name,
        value: res?.id,
        data: {
          name: res.name,
          slug: res.slug,
          image: res.category_icon ? res.category_icon.original_url : 'assets/images/category.png',
        },
      };
    });
  }

  @Selector()
  static categoriesSlug(state: CategoryStateModel) {
    return state.category.data.map(res => {
      return {
        label: res?.name,
        value: res?.slug,
        data: {
          name: res.name,
          slug: res.slug,
          image: res.category_icon ? res.category_icon.original_url : 'assets/images/category.png',
        },
      };
    });
  }

  @Selector()
  static selectedCategory(state: CategoryStateModel) {
    return state.selectedCategory;
  }

  @Action(GetCategoriesAction)
  getCategories(ctx: StateContext<CategoryStateModel>, action: GetCategoriesAction) {
    return this.categoryService.getCategories(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            category: {
              data: result.data,
              total: result?.total ? result?.total : result.data.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateCategoryAction)
  create(_ctx: StateContext<CategoryStateModel>, _action: CreateCategoryAction) {
    // Create Category Logic Here
  }

  @Action(EditCategoryAction)
  edit(ctx: StateContext<CategoryStateModel>, { id }: EditCategoryAction) {
    return this.categoryService.getCategories().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(category => category.id == id);
          ctx.patchState({
            ...state,
            selectedCategory: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateCategoryAction)
  update(
    _ctx: StateContext<CategoryStateModel>,
    { payload: _payload, id: _id }: UpdateCategoryAction,
  ) {
    // Update Category Logic Here
  }

  @Action(DeleteCategoryAction)
  delete(_ctx: StateContext<CategoryStateModel>, { id: _id, type: _type }: DeleteCategoryAction) {
    // Delete Category Logic Here
  }

  @Action(ImportCategoryAction)
  import(_ctx: StateContext<CategoryStateModel>, _action: ImportCategoryAction) {
    // Import Category Logic Here
  }

  @Action(ExportCategoryAction)
  export(_ctx: StateContext<CategoryStateModel>, _action: ExportCategoryAction) {
    // Export Category Logic Here
  }
}
