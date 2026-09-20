import { Params } from '../../interface/core.interface';

import {
  ICmsPagePayload,
  ICmsPagePublicationPayload,
} from '../../interface/cms-page.interface';

//==================================================
//==== LIST
//==================================================

export class GetCmsPagesAction {
  static readonly type = '[CMS Page] Get List';

  constructor(public payload?: Params) {}
}

//==================================================
//==== TRASH
//==================================================

export class GetCmsPageTrashAction {
  static readonly type = '[CMS Page] Get Trash';

  constructor(public payload?: Params) {}
}

//==================================================
//==== DETAIL
//==================================================

export class GetCmsPageDetailAction {
  static readonly type = '[CMS Page] Get Detail';

  constructor(public id: string) {}
}

//==================================================
//==== CREATE
//==================================================

export class CreateCmsPageAction {
  static readonly type = '[CMS Page] Create';

  constructor(public payload: ICmsPagePayload) {}
}

//==================================================
//==== UPDATE
//==================================================

export class UpdateCmsPageAction {
  static readonly type = '[CMS Page] Update';

  constructor(
    public id: string,

    public payload: ICmsPagePayload,
  ) {}
}

//==================================================
//==== PUBLICATION
//==================================================

export class UpdateCmsPagePublicationAction {
  static readonly type = '[CMS Page] Update Publication';

  constructor(
    public id: string,

    public payload: ICmsPagePublicationPayload,
  ) {}
}

//==================================================
//==== DELETE
//==================================================

export class DeleteCmsPageAction {
  static readonly type = '[CMS Page] Delete';

  constructor(public id: string) {}
}

//==================================================
//==== RESTORE
//==================================================

export class RestoreCmsPageAction {
  static readonly type = '[CMS Page] Restore';

  constructor(public id: string) {}
}
