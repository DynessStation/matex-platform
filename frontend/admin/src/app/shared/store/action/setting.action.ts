import { IAppSetting, ISetting } from '../../interface/setting.interface';

export class GetSettingOptionAction {
  static readonly type = '[Setting] Get';
}

export class UpdateSettingOptionAction {
  static readonly type = '[Setting] Update';
  constructor(public payload: ISetting) {}
}

export class TestEmailAction {
  static readonly type = '[Setting] Test Email Update';
  constructor(public payload: ISetting) {}
}

export class GetAppSettingOptionAction {
  static readonly type = '[App Setting] Get';
}

export class UpdateAppSettingOptionAction {
  static readonly type = '[App Setting] Update';
  constructor(public payload: IAppSetting) {}
}
