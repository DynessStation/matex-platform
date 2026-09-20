import { Params } from '../../interface/core.interface';

//==================================================
//==== GET LIST
//==================================================

export class GetAuditLogsAction {
  static readonly type = '[Audit Log] Get List';

  constructor(public payload?: Params) {}
}

//==================================================
//==== GET DETAIL
//==================================================

export class GetAuditLogDetailAction {
  static readonly type = '[Audit Log] Get Detail';

  constructor(public id: string) {}
}

//==================================================
//==== CLEAR DETAIL
//==================================================

export class ClearAuditLogDetailAction {
  static readonly type = '[Audit Log] Clear Detail';
}
