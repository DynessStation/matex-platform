import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { Observable, catchError, throwError } from 'rxjs';

import { AuthClearAction } from '../../shared/store/action/auth.action';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private router = inject(Router);

  private store = inject(Store);

  intercept<T>(
    req: HttpRequest<T>,

    next: HttpHandler,
  ): Observable<HttpEvent<T>> {
    const authReq = req.clone({
      withCredentials: true,
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        //==================================================
        //==== LOGIN REQUEST
        //==================================================

        const isLoginRequest = authReq.url.includes('/api/v1/admin-acct/login');

        //==================================================
        //==== SESSION 401
        //==================================================
        //
        // Invalid credentials adalah 401 juga,
        // tetapi bukan session-expiry.
        //

        if (error.status === 401 && !isLoginRequest) {
          this.store.dispatch(new AuthClearAction());

          if (!this.router.url.startsWith('/auth/')) {
            void this.router.navigate(['/auth/login']);
          }
        }

        return throwError(() => error);
      }),
    );
  }
}
