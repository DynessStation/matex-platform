import { Params } from '../../interface/core.interface';
import { IPage } from '../../interface/page.interface';

export class GetPagesAction {
  static readonly type = '[Page] Get';
  constructor(public payload?: Params) {}
}

export class CreatePageAction {
  static readonly type = '[Page] Create';
  constructor(public payload: IPage) {}
}

export class EditPageAction {
  static readonly type = '[Page] Edit';
  constructor(public id: number) {}
}

export class UpdatePageAction {
  static readonly type = '[Page] Update';
  constructor(
    public payload: IPage,
    public id: number,
  ) {}
}

export class UpdatePageStatusAction {
  static readonly type = '[Page] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeletePageAction {
  static readonly type = '[Page] Delete';
  constructor(public id: number) {}
}

export class DeleteAllPageAction {
  static readonly type = '[Page] Delete All';
  constructor(public ids: number[]) {}
}
