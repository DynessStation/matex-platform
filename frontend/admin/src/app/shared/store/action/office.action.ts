import { Params } from '../../interface/core.interface';

import {
  IOfficePayload,
  IUpdateOfficeStatus,
} from '../../interface/office.interface';

//==================================================
//==== LIST
//==================================================

export class GetOfficesAction {
  static readonly type = '[Office] Get List';

  constructor(public payload?: Params) {}
}

//==================================================
//==== DETAIL
//==================================================

export class GetOfficeDetailAction {
  static readonly type = '[Office] Get Detail';

  constructor(public id: string) {}
}

//==================================================
//==== CREATE
//==================================================

export class CreateOfficeAction {
  static readonly type = '[Office] Create';

  constructor(public payload: IOfficePayload) {}
}

//==================================================
//==== UPDATE
//==================================================

export class UpdateOfficeAction {
  static readonly type = '[Office] Update';

  constructor(
    public id: string,

    public payload: IOfficePayload,
  ) {}
}

//==================================================
//==== STATUS
//==================================================

export class UpdateOfficeStatusAction {
  static readonly type = '[Office] Update Status';

  constructor(
    public id: string,

    public payload: IUpdateOfficeStatus,
  ) {}
}

//==================================================
//==== DELETE
//==================================================

export class DeleteOfficeAction {
  static readonly type = '[Office] Delete';

  constructor(public id: string) {}
}
