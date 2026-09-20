import { Injectable, PLATFORM_ID, inject } from "@angular/core";

import { isPlatformBrowser } from "@angular/common";

import {
  CanActivate,
  CanActivateChild,
  Router,
  UrlTree,
} from "@angular/router";

import { Store } from "@ngxs/store";

import { Observable, catchError, map, of, take } from "rxjs";

import { CheckAuthAction } from "../../shared/store/action/auth.action";

import { AuthState } from "../../shared/store/state/auth.state";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private store = inject(Store);

  private router = inject(Router);

  private platformId = inject(PLATFORM_ID);

  //==================================================
  //==== CAN ACTIVATE
  //==================================================

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    //==================================================
    //==== SSR
    //==================================================

    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    //==================================================
    //==== BROWSER
    //==================================================

    return this.checkAuth();
  }

  //==================================================
  //==== CAN ACTIVATE CHILD
  //==================================================

  canActivateChild(): Observable<boolean | UrlTree> | boolean | UrlTree {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    return this.checkAuth();
  }

  //==================================================
  //==== CHECK AUTH
  //==================================================

  private checkAuth(): Observable<boolean | UrlTree> {
    const authenticated = this.store.selectSnapshot(AuthState.isAuthenticated);

    if (authenticated) {
      return of(true);
    }

    return this.store.dispatch(new CheckAuthAction()).pipe(
      take(1),

      map(() => {
        const isAuthenticated = this.store.selectSnapshot(
          AuthState.isAuthenticated,
        );

        if (isAuthenticated) {
          return true;
        }

        return this.router.createUrlTree(["/auth/login"]);
      }),

      catchError(() => of(this.router.createUrlTree(["/auth/login"]))),
    );
  }
}
