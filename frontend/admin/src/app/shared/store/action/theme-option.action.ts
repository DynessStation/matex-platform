import { IOption } from '../../interface/theme-option.interface';

export class GetThemeOptionAction {
  static readonly type = '[ThemeOption] Get';
}

export class UpdateThemeOptionAction {
  static readonly type = '[ThemeOption] Update';
  constructor(public payload: { options: IOption }) {}
}
