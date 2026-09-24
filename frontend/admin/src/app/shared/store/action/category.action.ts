import { ICategoryPayload } from '../../interface/category.interface';
import { Params } from '../../interface/core.interface';

export class GetCategoriesAction {
  static readonly type = '[Category] Get';
  constructor(public payload?: Params) {}
}

export class CreateCategoryAction {
  static readonly type = '[Category] Create';
  constructor(public payload: ICategoryPayload) {}
}

export class EditCategoryAction {
  static readonly type = '[Category] Edit';
  constructor(public id: string) {}
}

export class UpdateCategoryAction {
  static readonly type = '[Category] Update';
  constructor(
    public payload: ICategoryPayload,
    public id: string,
  ) {}
}

export class DeleteCategoryAction {
  static readonly type = '[Category] Delete';
  constructor(
    public id: string,
    public type: string | null,
  ) {}
}

export class ImportCategoryAction {
  static readonly type = '[Category] Import';
  constructor(public payload: File[]) {}
}

export class ExportCategoryAction {
  static readonly type = '[Category] Export';
}
