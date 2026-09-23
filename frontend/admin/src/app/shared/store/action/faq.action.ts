import { Params } from '../../interface/core.interface';
import { IFaqPayload } from '../../interface/faq.interface';

export class GetFaqsAction {
  static readonly type = '[Faq] Get';
  constructor(public payload?: Params) {}
}

export class CreateFaqAction {
  static readonly type = '[Faq] Create';
  constructor(public payload: IFaqPayload) {}
}

export class EditFaqAction {
  static readonly type = '[Faq] Edit';
  constructor(public id: string) {}
}

export class UpdateFaqAction {
  static readonly type = '[Faq] Update';
  constructor(
    public payload: IFaqPayload,
    public id: string,
  ) {}
}

export class UpdateFaqStatusAction {
  static readonly type = '[Faq] Update Status';
  constructor(
    public id: string,
    public status: 0 | 1,
  ) {}
}

export class DeleteFaqAction {
  static readonly type = '[Faq] Delete';
  constructor(public id: string) {}
}

export class DeleteAllFaqAction {
  static readonly type = '[Faq] Delete All';
  constructor(public ids: string[]) {}
}
