import { Params } from '../../interface/core.interface';
import { ILicenseKey } from '../../interface/license-key.interface';

export class GetLicenseKeysAction {
  static readonly type = '[LicenseKey] Get';
  constructor(public payload?: Params) {}
}

export class CreateLicenseKeyAction {
  static readonly type = '[LicenseKey] Create';
  constructor(public payload: ILicenseKey) {}
}

export class EditLicenseKeyAction {
  static readonly type = '[LicenseKey] Edit';
  constructor(public id: number) {}
}

export class UpdateLicenseKeyAction {
  static readonly type = '[LicenseKey] Update';
  constructor(
    public payload: ILicenseKey,
    public id: number,
  ) {}
}

export class UpdateLicenseKeyStatusAction {
  static readonly type = '[LicenseKey] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteLicenseKeyAction {
  static readonly type = '[LicenseKey] Delete';
  constructor(public id: number) {}
}

export class DeleteAllLicenseKeyAction {
  static readonly type = '[LicenseKey] Delete All';
  constructor(public ids: number[]) {}
}
