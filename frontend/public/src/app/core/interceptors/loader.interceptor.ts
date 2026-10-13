import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Store } from '@ngxs/store';
import { finalize, Observable } from 'rxjs';

import {
  HideButtonSpinnerAction,
  HideLoaderAction,
  ShowButtonSpinnerAction,
  ShowLoaderAction,
} from '../../shared/store/action/loader.action';
import { SKIP_PUBLIC_UI_INTERCEPTORS } from './public-request-context';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private store: Store) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.context.get(SKIP_PUBLIC_UI_INTERCEPTORS)) {
      return next.handle(req);
    }

    const isReadRequest = req.method === 'GET';

    void Promise.resolve(null).then(() => {
      this.store.dispatch(new ShowLoaderAction());
      if (!isReadRequest) {
        this.store.dispatch(new ShowButtonSpinnerAction());
      }
    });

    return next.handle(req).pipe(
      finalize(() => {
        void Promise.resolve(null).then(() => {
          this.store.dispatch(new HideLoaderAction());
          if (!isReadRequest) {
            this.store.dispatch(new HideButtonSpinnerAction());
          }
        });
      }),
    );
  }
}
