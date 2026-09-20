import { Injectable, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';

import { finalize, tap } from 'rxjs';

import { IAuthAdminUser, IAuthResponse } from '../../interface/auth.interface';

import { AuthService } from '../../services/auth.service';

import { NotificationService } from '../../services/notification.service';

import { SessionService } from '../../services/session.service';

import { AccountClearAction } from '../action/account.action';

import {
  AuthClearAction,
  CheckAuthAction,
  ForgotPassWordAction,
  LoginAction,
  LogoutAction,
  UpdatePasswordAction,
  VerifyEmailOtpAction,
} from '../action/auth.action';

import { GetNotificationAction } from '../action/notification.action';

import { GetSettingOptionAction } from '../action/setting.action';

import { GetBadgesAction } from '../action/sidebar.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AuthStateModel {
  user: IAuthAdminUser | null;

  email: string;

  authenticated: boolean;

  is_all_access: boolean;

  permissions: string[];

  session: {
    issued_at: number | null;

    expires_at: number | null;
  };
}

//==================================================
//==== STATE
//==================================================

@State<AuthStateModel>({
  name: 'auth',

  defaults: {
    user: null,

    email: '',

    authenticated: false,

    is_all_access: false,

    permissions: [],

    session: {
      issued_at: null,

      expires_at: null,
    },
  },
})
@Injectable()
export class AuthState {
  private store = inject(Store);

  private router = inject(Router);

  private notificationService = inject(NotificationService);

  private authService = inject(AuthService);

  private sessionService = inject(SessionService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static user(state: AuthStateModel): IAuthAdminUser | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.authenticated;
  }

  @Selector()
  static email(state: AuthStateModel): string {
    return state.email;
  }

  @Selector()
  static permissions(state: AuthStateModel): string[] {
    return state.permissions;
  }

  @Selector()
  static session(state: AuthStateModel) {
    return state.session;
  }

  @Selector()
  static isAllAccess(state: AuthStateModel): boolean {
    return state.is_all_access;
  }

  //==================================================
  //==== LOGIN
  //==================================================

  @Action(LoginAction)
  login(
    ctx: StateContext<AuthStateModel>,

    action: LoginAction,
  ) {
    //==================================================
    //==== LOGIN ALERT MODE
    //==================================================
    //
    // Login error ditampilkan lewat <app-alert>,
    // bukan toastr.
    //

    this.notificationService.notification = false;

    return this.authService.login(action.payload).pipe(
      tap((response: IAuthResponse) => {
        const user = response.data;

        ctx.patchState({
          user,

          email: user?.email_1 ?? '',

          authenticated: true,

          permissions: user?.access?.permissions ?? [],

          is_all_access: user?.is_all_access === 1,

          session: {
            issued_at: response.session?.issued_at ?? null,

            expires_at: response.session?.expires_at ?? null,
          },
        });

        this.sessionService.startExpiryWatcher();

        //==================================================
        //==== APPLICATION DATA
        //==================================================

        this.store.dispatch([
          new GetBadgesAction(),

          new GetNotificationAction(),

          new GetSettingOptionAction(),
        ]);
      }),

      //==================================================
      //==== RESTORE GLOBAL TOAST MODE
      //==================================================

      finalize(() => {
        this.notificationService.notification = true;
      }),
    );
  }

  //==================================================
  //==== CHECK AUTH
  //==================================================

  @Action(CheckAuthAction)
  checkAuth(ctx: StateContext<AuthStateModel>) {
    return this.authService.me().pipe(
      tap((response: IAuthResponse) => {
        const user = response.data;

        ctx.patchState({
          user,

          email: user?.email_1 ?? '',

          authenticated: true,

          permissions: user?.access?.permissions ?? [],

          is_all_access: user?.is_all_access === 1,

          session: {
            issued_at: response.session?.issued_at ?? null,

            expires_at: response.session?.expires_at ?? null,
          },
        });

        this.sessionService.startExpiryWatcher();
      }),
    );
  }

  //==================================================
  //==== FORGOT PASSWORD
  //==================================================

  @Action(ForgotPassWordAction)
  forgotPassword(
    _ctx: StateContext<AuthStateModel>,

    _action: ForgotPassWordAction,
  ) {
    this.notificationService.notification = false;
  }

  //==================================================
  //==== VERIFY EMAIL
  //==================================================

  @Action(VerifyEmailOtpAction)
  verifyEmail(
    _ctx: StateContext<AuthStateModel>,

    _action: VerifyEmailOtpAction,
  ) {
    this.notificationService.notification = false;
  }

  //==================================================
  //==== UPDATE PASSWORD
  //==================================================

  @Action(UpdatePasswordAction)
  updatePassword(
    _ctx: StateContext<AuthStateModel>,

    _action: UpdatePasswordAction,
  ) {
    this.notificationService.notification = false;
  }

  //==================================================
  //==== LOGOUT
  //==================================================

  @Action(LogoutAction)
  logout(_ctx: StateContext<AuthStateModel>) {
    return this.authService.logout().pipe(
      finalize(() => {
        this.store.dispatch(new AuthClearAction());

        void this.router.navigate(['/auth/login']);
      }),
    );
  }

  //==================================================
  //==== CLEAR AUTH
  //==================================================

  @Action(AuthClearAction)
  authClear(ctx: StateContext<AuthStateModel>) {
    this.sessionService.stopExpiryWatcher();

    ctx.setState({
      user: null,

      email: '',

      authenticated: false,

      is_all_access: false,

      permissions: [],

      session: {
        issued_at: null,

        expires_at: null,
      },
    });

    //==================================================
    //==== CLEAR LEGACY ACCOUNT STATE
    //==================================================

    this.store.dispatch(new AccountClearAction());
  }
}
