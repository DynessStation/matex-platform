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

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private store: Store) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isReadRequest = req.method === 'GET';

    void Promise.resolve(null).then(() => {
      if (isReadRequest) {
        this.store.dispatch(new ShowLoaderAction());
      } else {
        this.store.dispatch(new ShowButtonSpinnerAction());
      }
    });

    return next.handle(req).pipe(
      finalize(() => {
        void Promise.resolve(null).then(() => {
          if (isReadRequest) {
            this.store.dispatch(new HideLoaderAction());
          } else {
            this.store.dispatch(new HideButtonSpinnerAction());
          }
        });
      }),
    );
  }
}
