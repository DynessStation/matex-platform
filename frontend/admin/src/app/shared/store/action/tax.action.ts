import { Params } from '../../interface/core.interface';
import { ITax } from '../../interface/tax.interface';

export class GetTaxesAction {
  static readonly type = '[Tax] Get';
  constructor(public payload?: Params) {}
}

export class CreateTaxAction {
  static readonly type = '[Tax] Create';
  constructor(public payload: ITax) {}
}

export class EditTaxAction {
  static readonly type = '[Tax] Edit';
  constructor(public id: number) {}
}

export class UpdateTaxAction {
  static readonly type = '[Tax] Update';
  constructor(
    public payload: ITax,
    public id: number,
  ) {}
}

export class UpdateTaxStatusAction {
  static readonly type = '[Tax] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteTaxAction {
  static readonly type = '[Tax] Delete';
  constructor(public id: number) {}
}

export class DeleteAllTaxAction {
  static readonly type = '[Tax] Delete All';
  constructor(public ids: number[]) {}
}
