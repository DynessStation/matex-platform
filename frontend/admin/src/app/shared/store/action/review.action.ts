import { Params } from '../../interface/core.interface';

export class GetReviewsAction {
  static readonly type = '[Review] Get';
  constructor(public payload?: Params) {}
}

export class DeleteReviewAction {
  static readonly type = '[Review] Delete';
  constructor(public id: number) {}
}

export class DeleteAllReviewAction {
  static readonly type = '[Review] Delete All';
  constructor(public ids: number[]) {}
}
