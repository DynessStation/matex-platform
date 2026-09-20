import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AuthService } from './../../shared/services/auth.service';
import { GetUserDetails } from './../../shared/store/action/account.action';

@Injectable({
  providedIn: 'root',
})
export class CheckoutGuard {
  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Store the attempted URL for redirecting after login
    this.authService.redirectUrl = state.url;

    if (this.store.selectSnapshot((state) => state.auth && state.auth.access_token)) {
      this.store.dispatch(new GetUserDetails()).subscribe({
        complete: () => {
          return true;
        },
      });
    } else {
      if (this.store.selectSnapshot((state) => state.setting)) {
        // Redirect to the login page
        if (this.store.selectSnapshot((state) => state.cart.is_digital_only)) {
          void this.router.navigateByUrl('/login');
          return true;
        }
      } else {
        void this.router.navigateByUrl('/login');

        return true;
      }
    }

    return true;
  }
}
