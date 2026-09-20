import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";

import { Injectable, inject } from "@angular/core";

import { Store } from "@ngxs/store";

import { Observable, finalize } from "rxjs";

import {
  HideButtonSpinnerAction,
  HideLoaderAction,
  ShowButtonSpinnerAction,
  ShowLoaderAction,
} from "../../shared/store/action/loader.action";

import { SKIP_GLOBAL_LOADER } from "./loader-context";

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private store = inject(Store);

  //==================================================
  //==== ACTIVE REQUEST COUNTER
  //==================================================

  private activeGetRequests = 0;

  private activeMutationRequests = 0;

  intercept<T>(
    req: HttpRequest<T>,
    next: HttpHandler,
  ): Observable<HttpEvent<T>> {
    const isGet = req.method === "GET";

    const skipGlobalLoader = req.context.get(SKIP_GLOBAL_LOADER);

    //==================================================
    //==== START GET LOADER
    //==================================================

    if (isGet && !skipGlobalLoader) {
      this.activeGetRequests++;

      if (this.activeGetRequests === 1) {
        this.store.dispatch(new ShowLoaderAction(true));
      }
    }

    //==================================================
    //==== START BUTTON SPINNER
    //==================================================

    if (!isGet) {
      this.activeMutationRequests++;

      if (this.activeMutationRequests === 1) {
        this.store.dispatch(new ShowButtonSpinnerAction(true));
      }
    }

    //==================================================
    //==== HANDLE REQUEST
    //==================================================

    return next.handle(req).pipe(
      finalize(() => {
        //==================================================
        //==== FINISH GET LOADER
        //==================================================

        if (isGet && !skipGlobalLoader) {
          this.activeGetRequests = Math.max(0, this.activeGetRequests - 1);

          if (this.activeGetRequests === 0) {
            this.store.dispatch(new HideLoaderAction());
          }
        }

        //==================================================
        //==== FINISH BUTTON SPINNER
        //==================================================

        if (!isGet) {
          this.activeMutationRequests = Math.max(
            0,
            this.activeMutationRequests - 1,
          );

          if (this.activeMutationRequests === 0) {
            this.store.dispatch(new HideButtonSpinnerAction());
          }
        }
      }),
    );
  }
}
