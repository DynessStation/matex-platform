import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, catchError, throwError } from 'rxjs';

import { ErrorService } from '../../shared/services/error.service';

import { LoggingService } from '../../shared/services/logging.service';

import { NotificationService } from '../../shared/services/notification.service';

@Injectable()
export class GlobalErrorHandlerInterceptor implements HttpInterceptor {
  private errorService = inject(ErrorService);

  private logger = inject(LoggingService);

  private notifier = inject(NotificationService);

  //==================================================
  //==== INTERCEPT
  //==================================================

  intercept<T>(
    request: HttpRequest<T>,

    next: HttpHandler,
  ): Observable<HttpEvent<T>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        //==================================================
        //==== DEBUG
        //==================================================

        console.error('HTTP Error:', error.error);

        //==================================================
        //==== LOGIN REQUEST
        //==================================================

        const isLoginRequest = request.url.includes('/api/v1/admin-acct/login');

        //==================================================
        //==== SESSION 401
        //==================================================
        //
        // Protected-request 401:
        // AuthInterceptor handles clear + redirect.
        //
        // Login 401:
        // continue below so invalid credentials
        // can be localized and shown in <app-alert>.
        //

        if (error.status === 401 && !isLoginRequest) {
          return throwError(() => error);
        }

        //==================================================
        //==== ERROR MESSAGE
        //==================================================

        const errorMessage = this.errorService.getClientErrorMessage(
          error.error,
        );

        //==================================================
        //==== LOG
        //==================================================

        this.logger.logError(errorMessage);

        //==================================================
        //==== NOTIFICATION
        //==================================================

        this.notifier.showError(errorMessage);

        //==================================================
        //==== RETHROW
        //==================================================

        return throwError(() => error);
      }),
    );
  }
}
