import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PUBLIC_CMS_REQUEST } from './public-cms.context';

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
    if (req.context.get(PUBLIC_CMS_REQUEST)) return next.handle(req);
    void Promise.resolve(null).then(() => {
      this.store.dispatch(new ShowLoaderAction(req.method == 'GET' ? true : false));
      this.store.dispatch(new ShowButtonSpinnerAction(req.method != 'GET' ? true : false));
    });

    return next.handle(req).pipe(
      tap({
        error: (_err) => {
          this.store.dispatch(new HideLoaderAction());
          this.store.dispatch(new HideButtonSpinnerAction());
        },
        complete: () => {
          this.store.dispatch(new HideLoaderAction());
          this.store.dispatch(new HideButtonSpinnerAction());
        },
      }),
    );
  }
}
