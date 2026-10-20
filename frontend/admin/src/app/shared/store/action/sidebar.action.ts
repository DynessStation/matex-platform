export class GetSidebarAction {
  static readonly type = '[Sidebar] Get';
}

export class UpdateBadgeValueAction {
  static readonly type = '[Sidebar] Update Badge';
  constructor(
    public path: string,
    public badgeValue: number,
  ) {}
}
