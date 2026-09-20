import { ICartAddOrUpdate } from '../../interface/cart.interface';

export class GetCartItemsAction {
  static readonly type = '[Cart] Get';
}

export class AddToCartAction {
  static readonly type = '[Cart] Add';
  constructor(public payload: ICartAddOrUpdate) {}
}

export class UpdateCartAction {
  static readonly type = '[Cart] Update';
  constructor(public payload: ICartAddOrUpdate) {}
}

export class DeleteCartAction {
  static readonly type = '[Cart] Delete';
  constructor(public id: number) {}
}

export class ClearCartAction {
  static readonly type = '[Cart] Clear';
  constructor() {}
}
