import { Params } from '../../interface/core.interface';
import { IRole } from '../../interface/role.interface';

export class GetRolesAction {
  static readonly type = '[Role] Get';
  constructor(public payload?: Params) {}
}

export class GetRoleModulesAction {
  static readonly type = '[Role] Module Get';
  constructor() {}
}

export class CreateRoleAction {
  static readonly type = '[Role] Create';
  constructor(public payload: IRole) {}
}

export class EditRoleAction {
  static readonly type = '[Role] Edit';
  constructor(public id: number) {}
}

export class UpdateRoleAction {
  static readonly type = '[Role] Update';
  constructor(
    public payload: IRole,
    public id: number,
  ) {}
}

export class DeleteRoleAction {
  static readonly type = '[Role] Delete';
  constructor(public id: number) {}
}

export class DeleteAllRoleAction {
  static readonly type = '[Role] Delete All';
  constructor(public ids: number[]) {}
}
