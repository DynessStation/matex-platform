import {
  IWebNavigationItemPayload,
  IWebNavigationPayload,
  IWebNavigationReorderPayload,
  IWebNavigationStatusPayload,
  IWebNavigationUpdatePayload,
} from '../../interface/web-navigation.interface';

export class GetWebNavigationsAction {
  static readonly type = '[Web Navigation] Get List';
}

export class GetWebNavigationDetailAction {
  static readonly type = '[Web Navigation] Get Detail';

  constructor(public id: string) {}
}

export class ClearWebNavigationDetailAction {
  static readonly type = '[Web Navigation] Clear Detail';
}

export class CreateWebNavigationAction {
  static readonly type = '[Web Navigation] Create';

  constructor(public payload: IWebNavigationPayload) {}
}

export class UpdateWebNavigationAction {
  static readonly type = '[Web Navigation] Update';

  constructor(
    public id: string,
    public payload: IWebNavigationUpdatePayload,
  ) {}
}

export class UpdateWebNavigationStatusAction {
  static readonly type = '[Web Navigation] Update Status';

  constructor(
    public id: string,
    public payload: IWebNavigationStatusPayload,
  ) {}
}

export class DeleteWebNavigationAction {
  static readonly type = '[Web Navigation] Delete';

  constructor(public id: string) {}
}

export class CreateWebNavigationItemAction {
  static readonly type = '[Web Navigation Item] Create';

  constructor(
    public navigationId: string,
    public payload: IWebNavigationItemPayload,
  ) {}
}

export class UpdateWebNavigationItemAction {
  static readonly type = '[Web Navigation Item] Update';

  constructor(
    public navigationId: string,
    public itemId: string,
    public payload: IWebNavigationItemPayload,
  ) {}
}

export class DeleteWebNavigationItemAction {
  static readonly type = '[Web Navigation Item] Delete';

  constructor(
    public navigationId: string,
    public itemId: string,
  ) {}
}

export class ReorderWebNavigationItemsAction {
  static readonly type = '[Web Navigation Item] Reorder';

  constructor(
    public navigationId: string,
    public payload: IWebNavigationReorderPayload,
  ) {}
}
