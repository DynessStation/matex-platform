import { isPlatformBrowser } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { ApiMessageService } from './api-message.service';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  //==================================================
  //==== INJECT
  //==================================================

  private platformId = inject(PLATFORM_ID);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== CLIENT ERROR MESSAGE
  //==================================================

  getClientErrorMessage(error: unknown): string {
    //==================================================
    //==== OFFLINE
    //==================================================

    if (
      isPlatformBrowser(this.platformId) &&
      typeof navigator !== 'undefined' &&
      !navigator.onLine
    ) {
      return this.apiMessageService.translateKey(
        'common.NO_INTERNET_CONNECTION',
        'No Internet Connection',
      );
    }

    //==================================================
    //==== API / CLIENT ERROR
    //==================================================

    return this.apiMessageService.resolveResponse(error);
  }

  //==================================================
  //==== SERVER ERROR MESSAGE
  //==================================================

  getServerErrorMessage(error: HttpErrorResponse): string {
    return this.apiMessageService.resolveResponse(error?.error, error?.message);
  }
}
