import { Params } from '../../interface/core.interface';
export class GetBlogsAction {
  static readonly type = '[Blog] Get';
  constructor(
    public payload?: Params,
    public locale = 'id-ID',
  ) {}
}
export class GetBlogBySlugAction {
  static readonly type = '[Blog] By Slug';
  constructor(
    public slug: string,
    public locale = 'id-ID',
  ) {}
}
export class GetRecentBlogAction {
  static readonly type = '[Blog] By Recent';
  constructor(
    public payload?: Params,
    public locale = 'id-ID',
  ) {}
}
export class GetSelectedBlogsAction {
  static readonly type = '[Blog] Selected';
  constructor(
    public payload?: Params,
    public locale = 'id-ID',
  ) {}
}
