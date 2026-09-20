export class GetThemesAction {
  static readonly type = '[IThemes] Get';
}

export class UpdateThemeAction {
  static readonly type = '[Theme] Update';
  constructor(
    public id: number,
    public status: number | boolean,
  ) {}
}

export class GetHomePageAction {
  static readonly type = '[Home Page] Get';
  constructor(public slug?: { slug: string }) {}
}

export class UpdateHomePageAction {
  static readonly type = '[Home Page] Put';
  constructor(
    public id: number,
    public payload: string,
  ) {}
}
