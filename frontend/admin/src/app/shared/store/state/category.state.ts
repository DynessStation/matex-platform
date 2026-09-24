import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import { ICategory, ICategoryDetail } from '../../interface/category.interface';
import { ApiMessageService } from '../../services/api-message.service';
import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateCategoryAction,
  DeleteCategoryAction,
  EditCategoryAction,
  GetCategoriesAction,
  UpdateCategoryAction,
} from '../action/category.action';

export interface CategoryStateModel {
  category: { data: ICategory[]; total: number };
  selectedCategory: ICategoryDetail | null;
}
@State<CategoryStateModel>({
  name: 'category',
  defaults: { category: { data: [], total: 0 }, selectedCategory: null },
})
@Injectable()
export class CategoryState {
  private service = inject(CategoryService);
  private notes = inject(NotificationService);
  private messages = inject(ApiMessageService);

  @Selector() static category(state: CategoryStateModel) {
    return state.category;
  }
  @Selector() static categories(state: CategoryStateModel) {
    const flatten = (items: ICategory[]): ICategory[] =>
      items.flatMap((item) => [item, ...flatten(item.subcategories ?? [])]);
    return flatten(state.category.data).map((item) => ({
      label: item.name,
      value: item.id,
      data: {
        name: item.name,
        slug: item.slug,
        image: item.category_icon?.asset_url || 'assets/images/category.png',
      },
    }));
  }
  @Selector() static categoriesSlug(state: CategoryStateModel) {
    const flatten = (items: ICategory[]): ICategory[] =>
      items.flatMap((item) => [item, ...flatten(item.subcategories ?? [])]);
    return flatten(state.category.data).map((item) => ({
      label: item.name,
      value: item.slug,
      data: { name: item.name, slug: item.slug },
    }));
  }
  @Selector() static selectedCategory(state: CategoryStateModel) {
    return state.selectedCategory;
  }

  @Action(GetCategoriesAction)
  get(ctx: StateContext<CategoryStateModel>, action: GetCategoriesAction) {
    return this.service
      .getCategories(action.payload)
      .pipe(tap((result) => ctx.patchState({ category: result })));
  }
  @Action(EditCategoryAction)
  edit(ctx: StateContext<CategoryStateModel>, action: EditCategoryAction) {
    ctx.patchState({ selectedCategory: null });
    return this.service
      .getCategory(action.id)
      .pipe(
        tap((result) =>
          ctx.patchState({ selectedCategory: result.data ?? null }),
        ),
      );
  }
  @Action(CreateCategoryAction)
  create(_: StateContext<CategoryStateModel>, action: CreateCategoryAction) {
    return this.service
      .create(action.payload)
      .pipe(
        tap((result) =>
          this.notes.showSuccess(this.messages.resolveResponse(result)),
        ),
      );
  }
  @Action(UpdateCategoryAction)
  update(_: StateContext<CategoryStateModel>, action: UpdateCategoryAction) {
    return this.service
      .update(action.id, action.payload)
      .pipe(
        tap((result) =>
          this.notes.showSuccess(this.messages.resolveResponse(result)),
        ),
      );
  }
  @Action(DeleteCategoryAction)
  delete(_: StateContext<CategoryStateModel>, action: DeleteCategoryAction) {
    return this.service
      .delete(action.id)
      .pipe(
        tap((result) =>
          this.notes.showSuccess(this.messages.resolveResponse(result)),
        ),
      );
  }
}
