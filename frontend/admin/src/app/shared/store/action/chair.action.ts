import { Params } from '../../interface/core.interface';

import {
  IChairPayload,
  IUpdateChairStatus,
} from '../../interface/chair.interface';

//==================================================
//==== GET LIST
//==================================================

export class GetChairsAction {
  static readonly type = '[Chair] Get List';

  constructor(public payload?: Params) {}
}

//==================================================
//==== GET DETAIL
//==================================================

export class GetChairDetailAction {
  static readonly type = '[Chair] Get Detail';

  constructor(public id: string) {}
}

//==================================================
//==== CREATE
//==================================================

export class CreateChairAction {
  static readonly type = '[Chair] Create';

  constructor(public payload: IChairPayload) {}
}

//==================================================
//==== UPDATE
//==================================================

export class UpdateChairAction {
  static readonly type = '[Chair] Update';

  constructor(
    public id: string,

    public payload: IChairPayload,
  ) {}
}

//==================================================
//==== STATUS
//==================================================

export class UpdateChairStatusAction {
  static readonly type = '[Chair] Update Status';

  constructor(
    public id: string,

    public payload: IUpdateChairStatus,
  ) {}
}

//==================================================
//==== DELETE
//==================================================

export class DeleteChairAction {
  static readonly type = '[Chair] Delete';

  constructor(public id: string) {}
}
