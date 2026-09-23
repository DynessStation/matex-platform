import { ArticleStatus, IArticlePayload } from '../../interface/blog.interface';
import { Params } from '../../interface/core.interface';
export class GetBlogsAction {
  static readonly type = '[Article] Get';
  constructor(public payload?: Params) {}
}
export class CreateBlogAction {
  static readonly type = '[Article] Create';
  constructor(public payload: IArticlePayload) {}
}
export class EditBlogAction {
  static readonly type = '[Article] Edit';
  constructor(public id: string) {}
}
export class UpdateBlogAction {
  static readonly type = '[Article] Update';
  constructor(
    public payload: IArticlePayload,
    public id: string,
  ) {}
}
export class UpdateBlogStatusAction {
  static readonly type = '[Article] Update Status';
  constructor(
    public id: string,
    public status: ArticleStatus,
  ) {}
}
export class DeleteBlogAction {
  static readonly type = '[Article] Delete';
  constructor(public id: string) {}
}
export class DeleteAllBlogAction {
  static readonly type = '[Article] Delete All';
  constructor(public ids: string[]) {}
}
