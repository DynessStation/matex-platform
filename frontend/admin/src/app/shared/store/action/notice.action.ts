import { Params } from '../../interface/core.interface';
import { INotice } from '../../interface/notice.interface';

export class GetNoticeAction {
  static readonly type = '[Notice] Get';
  constructor(public payload?: Params) {}
}

export class CreateNoticeAction {
  static readonly type = '[Notice] Create';
  constructor(public payload: INotice) {}
}

export class EditNoticeAction {
  static readonly type = '[Notice] Edit';
  constructor(public id: number | string) {}
}

export class ResentNoticeAction {
  static readonly type = '[Notice] Resent';
  constructor(public id: number | string) {}
}

export class UpdateNoticeAction {
  static readonly type = '[Notice] Update';
  constructor(
    public payload: INotice,
    public id: number,
  ) {}
}

export class UpdateNoticeStatusAction {
  static readonly type = '[Notice] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class MarkAsReadNoticeAction {
  static readonly type = '[Notice] MarkAsRead';
  constructor(public id: number) {}
}

export class DeleteNoticeAction {
  static readonly type = '[Notice] Delete';
  constructor(public id: number) {}
}
