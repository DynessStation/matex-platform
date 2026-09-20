import { Params } from '../../interface/core.interface';
import { ITag } from '../../interface/tag.interface';

export class GetTagsAction {
  static readonly type = '[Tag] Get';
  constructor(public payload?: Params) {}
}

export class CreateTagAction {
  static readonly type = '[Tag] Create';
  constructor(public payload: ITag) {}
}

export class EditTagAction {
  static readonly type = '[Tag] Edit';
  constructor(public id: number) {}
}

export class UpdateTagAction {
  static readonly type = '[Tag] Update';
  constructor(
    public payload: ITag,
    public id: number,
  ) {}
}

export class UpdateTagStatusAction {
  static readonly type = '[Tag] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteTagAction {
  static readonly type = '[Tag] Delete';
  constructor(public id: number) {}
}

export class DeleteAllTagAction {
  static readonly type = '[Tag] Delete All';
  constructor(public ids: number[]) {}
}

export class ImportTagAction {
  static readonly type = '[Tag] Import';
  constructor(public payload: File[]) {}
}

export class ExportTagAction {
  static readonly type = '[Tag] Export';
}
