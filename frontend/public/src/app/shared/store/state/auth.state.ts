import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Action, Selector, State, StateContext, Store } from '@ngxs/store';

import { AuthNumberLoginState } from '../../interface/auth.interface';
import { AuthService } from '../../services/auth.service';
import { AccountClear, GetUserDetails } from '../action/account.action';
import {
  AuthClear,
  ForgotPasswordAction,
  LoginAction,
  LoginWithNumberAction,
  Logout,
  RegisterAction,
  UpdatePasswordAction,
  VerifyNumberOTP,
  VerifyOTP,
} from '../action/auth.action';
import { ClearCart } from '../action/cart.action';

export interface AuthStateModel {
  email: string;
  number: AuthNumberLoginState | null;
  token: string | Number;
  access_token: string | null;
  permissions: [];
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    email: '',
    token: '',
    number: null,
    access_token: '',
    permissions: [],
  },
})
@Injectable()
export class AuthState {
  constructor(
    private store: Store,
    public router: Router,
    private modalService: NgbModal,
    private authService: AuthService,
  ) {}

  ngxsOnInit(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({
      email: 'john.customer@example.com',
      token: '',
      access_token: '115|laravel_sanctum_mp1jyyMyKeE4qVsD1bKrnSycnmInkFXXIrxKv49w49d2a2c5',
    });
  }

  @Selector()
  static accessToken(state: AuthStateModel): string | null {
    return state.access_token;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return !!state.access_token;
  }

  @Selector()
  static email(state: AuthStateModel): string {
    return state.email;
  }

  @Selector()
  static number(state: AuthStateModel): AuthNumberLoginState | null {
    return state.number;
  }

  @Selector()
  static token(state: AuthStateModel): string | Number {
    return state.token;
  }

  @Action(RegisterAction)
  register(_ctx: StateContext<AuthStateModel>, _action: RegisterAction) {
    // Register Logic Here
  }

  @Action(LoginAction)
  loginActiLoginAction(_ctx: StateContext<AuthStateModel>, _action: LoginAction) {
    // Login Logic Here
    this.store.dispatch(new GetUserDetails());
  }

  @Action(LoginWithNumberAction)
  loginWithNumber(_ctx: StateContext<AuthStateModel>, _action: LoginWithNumberAction) {
    // Login Logic Here
    this.store.dispatch(new GetUserDetails());
  }

  @Action(ForgotPasswordAction)
  forgotPassword(_ctx: StateContext<AuthStateModel>, _action: ForgotPasswordAction) {
    // Forgot Password Logic Here
  }

  @Action(VerifyOTP)
  verifyEmail(_ctx: StateContext<AuthStateModel>, _action: VerifyOTP) {
    // Verify Logic Here
  }

  @Action(VerifyNumberOTP)
  verifyNumber(_ctx: StateContext<AuthStateModel>, _action: VerifyNumberOTP) {
    // Verify Logic Here
    this.store.dispatch(new GetUserDetails());
  }

  @Action(UpdatePasswordAction)
  updatePassword(_ctx: StateContext<AuthStateModel>, _action: UpdatePasswordAction) {
    // Update Password Logic Here
  }

  @Action(Logout)
  logout(_ctx: StateContext<AuthStateModel>) {
    // Logout Logic Here
    this.store.dispatch(new AuthClear());
    void this.router.navigate(['/']);
    this.modalService.dismissAll();
  }

  @Action(AuthClear)
  authClear(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({
      email: '',
      token: '',
      access_token: null,
      permissions: [],
    });
    this.authService.redirectUrl = undefined;
    this.store.dispatch(new AccountClear());
    this.store.dispatch(new ClearCart());
  }
}
