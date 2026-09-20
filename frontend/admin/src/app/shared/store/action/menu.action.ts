import { Params } from '../../interface/core.interface';
import { IMenu } from '../../interface/menu.interface';

export class GetMenuAction {
  static readonly type = '[Menu] Get';
  constructor(public payload?: Params) {}
}

export class CreateMenuAction {
  static readonly type = '[Menu] Create';
  constructor(public payload: IMenu) {}
}

export class EditMenuAction {
  static readonly type = '[Menu] Edit';
  constructor(public id: number) {}
}

export class UpdateMenuAction {
  static readonly type = '[Menu] Update';
  constructor(
    public payload: IMenu,
    public id: number,
  ) {}
}

export class UpdateSortMenuAction {
  static readonly type = '[Menu] Update Sort';
  constructor(public payload: Params) {}
}

export class DeleteMenuAction {
  static readonly type = '[Menu] Delete';
  constructor(public id: number) {}
}
