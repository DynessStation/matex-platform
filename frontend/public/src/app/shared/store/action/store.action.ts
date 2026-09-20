import { Params } from '../../interface/core.interface';

export class GetStoresAction {
  static readonly type = '[Store] Get';
  constructor(public payload?: Params) {}
}

export class GetStoreBySlugAction {
  static readonly type = '[Store] Get By Slug';
  constructor(public slug: string) {}
}
