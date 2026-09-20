import {
  IAuthUserForgotModel,
  IAuthUserStateModel,
  IUpdatePasswordModel,
  IVerifyEmailOtpModel,
} from '../../interface/auth.interface';

export class LoginAction {
  static readonly type = '[Auth] Login';
  constructor(public payload: IAuthUserStateModel) {}
}

export class ForgotPassWordAction {
  static readonly type = '[Auth] Forgot';
  constructor(public payload: IAuthUserForgotModel) {}
}

export class VerifyEmailOtpAction {
  static readonly type = '[Auth] VerifyEmailOtp';
  constructor(public payload: IVerifyEmailOtpModel) {}
}

export class UpdatePasswordAction {
  static readonly type = '[Auth] UpdatePassword';
  constructor(public payload: IUpdatePasswordModel) {}
}

export class LogoutAction {
  static readonly type = '[Auth] Logout';
} 

export class AuthClearAction {
  static readonly type = '[Auth] Clear';
}

export class CheckAuthAction {
  static readonly type = '[Auth] Check';
}
