import { Params } from '../../interface/core.interface';
import { IFaq } from '../../interface/faq.interface';

export class GetFaqsAction {
  static readonly type = '[Faq] Get';
  constructor(public payload?: Params) {}
}

export class CreateFaqAction {
  static readonly type = '[Faq] Create';
  constructor(public payload: IFaq) {}
}

export class EditFaqAction {
  static readonly type = '[Faq] Edit';
  constructor(public id: number) {}
}

export class UpdateFaqAction {
  static readonly type = '[Faq] Update';
  constructor(
    public payload: IFaq,
    public id: number,
  ) {}
}

export class UpdateFaqStatusAction {
  static readonly type = '[Faq] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class ApproveFaqStatusAction {
  static readonly type = '[Faq] Approve Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteFaqAction {
  static readonly type = '[Faq] Delete';
  constructor(public id: number) {}
}

export class DeleteAllFaqAction {
  static readonly type = '[Faq] Delete All';
  constructor(public ids: number[]) {}
}
