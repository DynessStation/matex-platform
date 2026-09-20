import { Params } from '../../interface/core.interface';
import { IStores } from '../../interface/store.interface';

export class GetStoresAction {
  static readonly type = '[Store] Get';
  constructor(public payload?: Params) {}
}

export class CreateStoreAction {
  static readonly type = '[Store] Create';
  constructor(public payload: IStores) {}
}

export class EditStoreAction {
  static readonly type = '[Store] Edit';
  constructor(public id: number) {}
}

export class UpdateStoreAction {
  static readonly type = '[Store] Update';
  constructor(
    public payload: IStores,
    public id: number,
  ) {}
}

export class UpdateStoreStatusAction {
  static readonly type = '[Store] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class ApproveStoreStatusAction {
  static readonly type = '[Store] Approve Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteStoreAction {
  static readonly type = '[Store] Delete';
  constructor(public id: number) {}
}

export class DeleteAllStoreAction {
  static readonly type = '[Store] Delete All';
  constructor(public ids: number[]) {}
}
