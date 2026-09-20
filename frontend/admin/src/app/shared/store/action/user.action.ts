import { Params } from '../../interface/core.interface';
import { IUser, IUserAddress } from '../../interface/user.interface';

export class GetUsersAction {
  static readonly type = '[User] Get';
  constructor(public payload?: Params) {}
}

export class CreateUserAction {
  static readonly type = '[User] Create';
  constructor(public payload: IUser) {}
}

export class EditUserAction {
  static readonly type = '[User] Edit';
  constructor(public id: number) {}
}

export class UpdateUserAction {
  static readonly type = '[User] Update';
  constructor(
    public payload: IUser,
    public id: number,
  ) {}
}

export class UpdateUserStatusAction {
  static readonly type = '[User] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteUserAction {
  static readonly type = '[User] Delete';
  constructor(public id: number) {}
}

export class DeleteAllUserAction {
  static readonly type = '[User] Delete All';
  constructor(public ids: number[]) {}
}

export class ImportUserAction {
  static readonly type = '[User] Import';
  constructor(public payload: File[]) {}
}

export class ExportUserAction {
  static readonly type = '[User] Export';
}

export class CreateUserAddressAction {
  static readonly type = '[User] Address Create';
  constructor(public payload: IUserAddress) {}
}
