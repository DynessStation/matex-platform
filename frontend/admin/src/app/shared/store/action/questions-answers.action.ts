import { Params } from '../../interface/core.interface';

export class GetQuestionAnswersAction {
  static readonly type = '[Question] Get';
  constructor(public payload?: Params) {}
}

export class EditQuestionAnswersAction {
  static readonly type = '[Question] Edit';
  constructor(public id: number) {}
}

export class UpdateQuestionAnswersAction {
  static readonly type = '[Question] put';
  constructor(
    public payload: Params,
    public id: number,
  ) {}
}

export class DeleteQuestionAnswersAction {
  static readonly type = '[Question] Delete';
  constructor(public id: number) {}
}

export class DeleteAllQuestionAnswersAction {
  static readonly type = '[Question] Delete All';
  constructor(public ids: number[]) {}
}
