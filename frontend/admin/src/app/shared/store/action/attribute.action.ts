import { IAttribute } from '../../interface/attribute.interface';
import { Params } from '../../interface/core.interface';

export class GetAttributesAction {
  static readonly type = '[Attribute] Get';
  constructor(public payload?: Params) {}
}

export class GetAttributeValuesAction {
  static readonly type = '[Attribute] Value Get';
  constructor(public payload?: Params) {}
}

export class CreateAttributeAction {
  static readonly type = '[Attribute] Create';
  constructor(public payload: IAttribute) {}
}

export class EditAttributeAction {
  static readonly type = '[Attribute] Edit';
  constructor(public id: number) {}
}

export class UpdateAttributeAction {
  static readonly type = '[Attribute] Update';
  constructor(
    public payload: IAttribute,
    public id: number,
  ) {}
}

export class UpdateAttributeStatusAction {
  static readonly type = '[Attribute] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteAttributeAction {
  static readonly type = '[Attribute] Delete';
  constructor(public id: number) {}
}

export class DeleteAllAttributeAction {
  static readonly type = '[Attribute] Delete All';
  constructor(public ids: number[]) {}
}

export class ImportAttributeAction {
  static readonly type = '[Attribute] Import';
  constructor(public payload: File[]) {}
}

export class ExportAttributeAction {
  static readonly type = '[Attribute] Export';
}
