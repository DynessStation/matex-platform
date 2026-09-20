import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';
import { GetUserDetails } from '../../shared/store/action/account.action';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    let is_redirect;

    // Store the attempted URL for redirecting after login
    this.authService.redirectUrl = state.url;

    // Redirect to the login page
    if (!this.store.selectSnapshot((state) => state.auth && state.auth.access_token)) {
      this.authService.isLogin = true;
      is_redirect = false;
    } else {
      is_redirect = true;
    }

    this.store.dispatch(new GetUserDetails()).subscribe({
      complete: () => {
        return true;
      },
    });

    return is_redirect;
  }

  canActivateChild(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    if (!!this.store.selectSnapshot((state) => state.auth && state.auth.access_token)) {
      if (
        this.router.url.startsWith('/account') ||
        this.router.url == '/checkout' ||
        this.router.url == '/compare'
      )
        void this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}
