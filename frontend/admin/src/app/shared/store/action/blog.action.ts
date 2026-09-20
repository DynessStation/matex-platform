import { IBlog } from '../../interface/blog.interface';
import { Params } from '../../interface/core.interface';

export class GetBlogsAction {
  static readonly type = '[Blog] Get';
  constructor(public payload?: Params) {}
}

export class CreateBlogAction {
  static readonly type = '[Blog] Create';
  constructor(public payload: IBlog) {}
}

export class EditBlogAction {
  static readonly type = '[IBlog] Edit';
  constructor(public id: number) {}
}

export class UpdateBlogAction {
  static readonly type = '[Blog] Update';
  constructor(
    public payload: IBlog,
    public id: number,
  ) {}
}

export class UpdateBlogStatusAction {
  static readonly type = '[Blog] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteBlogAction {
  static readonly type = '[Blog] Delete';
  constructor(public id: number) {}
}

export class DeleteAllBlogAction {
  static readonly type = '[Blog] Delete All';
  constructor(public ids: number[]) {}
}
