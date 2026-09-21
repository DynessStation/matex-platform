import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Values } from '../../shared/interface/setting.interface';
import { AuthService } from '../../shared/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthClear } from '../../shared/store/action/auth.action';
import { SettingState } from '../../shared/store/state/setting.state';
import { PUBLIC_CMS_REQUEST } from './public-cms.context';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private store = inject(Store);
  setting$: Observable<Values | null> = this.store.select(SettingState.setting);

  public isMaintenanceModeOn: boolean = false;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private notificationService: NotificationService,
    public authService: AuthService,
  ) {
    this.setting$.subscribe((setting) => {
      this.isMaintenanceModeOn = setting?.maintenance?.maintenance_mode!;
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    if (req.context.get(PUBLIC_CMS_REQUEST)) return next.handle(req);
    // If Maintenance Mode On
    if (this.isMaintenanceModeOn) {
      this.ngZone.run(() => {
        void this.router.navigate(['/maintenance']);
      });
      // End the interceptor chain if in maintenance mode
    }

    const token = this.store.selectSnapshot((state) => state.auth.access_token);
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.notificationService.notification = false;
          this.store.dispatch(new AuthClear());
          this.authService.isLogin = true;
        }
        return throwError(() => error);
      }),
    );
  }
}
