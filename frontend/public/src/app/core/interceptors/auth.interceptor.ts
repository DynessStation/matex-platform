import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Values } from '../../shared/interface/setting.interface';
import { SettingState } from '../../shared/store/state/setting.state';
import { SKIP_PUBLIC_UI_INTERCEPTORS } from './public-request-context';

// Sends visitors to the maintenance page while maintenance mode is on. The public site has no
// sign-in, so the Kartify token and 401 handling were removed in 6B.
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private store = inject(Store);
  setting$: Observable<Values | null> = this.store.select(SettingState.setting);

  public isMaintenanceModeOn: boolean = false;

  constructor(
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.setting$.subscribe((setting) => {
      this.isMaintenanceModeOn = setting?.maintenance?.maintenance_mode!;
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    if (req.context.get(SKIP_PUBLIC_UI_INTERCEPTORS)) {
      return next.handle(req);
    }

    // If Maintenance Mode On
    if (this.isMaintenanceModeOn) {
      this.ngZone.run(() => {
        void this.router.navigate(['/maintenance']);
      });
      // End the interceptor chain if in maintenance mode
    }

    return next.handle(req);
  }
}
