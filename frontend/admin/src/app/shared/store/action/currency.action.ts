import { Params } from '../../interface/core.interface';
import { ICurrency } from '../../interface/currency.interface';

export class GetCurrenciesAction {
  static readonly type = '[Currency] Get';
  constructor(public payload?: Params) {}
}

export class CreateCurrencyAction {
  static readonly type = '[Currency] Create';
  constructor(public payload: ICurrency) {}
}

export class EditCurrencyAction {
  static readonly type = '[Currency] Edit';
  constructor(public id: number) {}
}

export class UpdateCurrencyAction {
  static readonly type = '[Currency] Update';
  constructor(
    public payload: ICurrency,
    public id: number,
  ) {}
}

export class UpdateCurrencyStatusAction {
  static readonly type = '[Currency] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteCurrencyAction {
  static readonly type = '[Currency] Delete';
  constructor(public id: number) {}
}

export class DeleteAllCurrencyAction {
  static readonly type = '[Currency] Delete All';
  constructor(public ids: number[]) {}
}
