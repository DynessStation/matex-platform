import { Params } from '../../interface/core.interface';

export class GetSidebarAction {
  static readonly type = '[Sidebar] Get';
}

export class GetBadgesAction {
  static readonly type = '[Sidebar] Badges Get';
  constructor(public payload?: Params) {}
}

export class UpdateBadgeValueAction {
  static readonly type = '[Sidebar] Update Badge';
  constructor(
    public path: string,
    public badgeValue: number,
  ) {}
}
