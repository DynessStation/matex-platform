import { IShipping, IShippingRule } from '../../interface/shipping.interface';

export class GetShippingsAction {
  static readonly type = '[Shipping] Get';
  constructor() {}
}

export class CreateShippingAction {
  static readonly type = '[Shipping] Create';
  constructor(public payload: IShipping) {}
}

export class EditShippingAction {
  static readonly type = '[Shipping] Edit';
  constructor(public id: number) {}
}

export class UpdateShippingAction {
  static readonly type = '[Shipping] Update';
  constructor(
    public payload: IShipping,
    public id: number,
  ) {}
}

export class DeleteShippingAction {
  static readonly type = '[Shipping] Delete';
  constructor(public id: number) {}
}

// For Shipping Rule

export class CreateShippingRuleAction {
  static readonly type = '[Shipping] Rule Create';
  constructor(public payload: IShippingRule) {}
}

export class EditShippingRuleAction {
  static readonly type = '[Shipping] Rule Edit';
  constructor(public id: number) {}
}

export class UpdateShippingRuleAction {
  static readonly type = '[Shipping] Rule Update';
  constructor(
    public payload: IShippingRule,
    public id: number,
  ) {}
}

export class DeleteShippingRuleAction {
  static readonly type = '[Shipping] Rule Delete';
  constructor(public id: number) {}
}
