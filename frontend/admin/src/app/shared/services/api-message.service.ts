import { Injectable, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

//==================================================
//==== API MESSAGE PAYLOAD
//==================================================

interface IApiMessagePayload {
  code?: unknown;

  message?: unknown;

  error?: unknown;
}

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class ApiMessageService {
  //==================================================
  //==== INJECT
  //==================================================

  private translate = inject(TranslateService);

  //==================================================
  //==== RESOLVE
  //==================================================

  resolve(
    code?: unknown,
    fallbackMessage?: unknown,
    defaultFallback?: string,
  ): string {
    const normalizedCode = typeof code === 'string' ? code.trim() : '';

    const normalizedFallback =
      typeof fallbackMessage === 'string' ? fallbackMessage.trim() : '';

    //==================================================
    //==== TRANSLATED API CODE
    //==================================================

    if (normalizedCode) {
      const key = `api.${normalizedCode}`;

      const translated = this.translate.instant(key);

      if (
        typeof translated === 'string' &&
        translated.trim() &&
        translated !== key
      ) {
        return translated;
      }
    }

    //==================================================
    //==== BACKEND FALLBACK
    //==================================================

    if (normalizedFallback) {
      return normalizedFallback;
    }

    //==================================================
    //==== CUSTOM FALLBACK
    //==================================================

    if (defaultFallback?.trim()) {
      return defaultFallback;
    }

    //==================================================
    //==== GENERIC FALLBACK
    //==================================================

    return this.translateKey(
      'common.SOMETHING_WENT_WRONG',
      'Something Went Wrong',
    );
  }

  //==================================================
  //==== RESOLVE RESPONSE
  //==================================================

  resolveResponse(response: unknown, defaultFallback?: string): string {
    //==================================================
    //==== STRING
    //==================================================

    if (typeof response === 'string') {
      return this.resolve(undefined, response, defaultFallback);
    }

    //==================================================
    //==== OBJECT
    //==================================================

    if (response && typeof response === 'object') {
      const payload = response as IApiMessagePayload;

      const directCode = payload.code;

      const directMessage = payload.message;

      if (directCode !== undefined || directMessage !== undefined) {
        return this.resolve(directCode, directMessage, defaultFallback);
      }

      //==================================================
      //==== NESTED ERROR
      //==================================================

      if (payload.error && typeof payload.error === 'object') {
        const nested = payload.error as IApiMessagePayload;

        return this.resolve(nested.code, nested.message, defaultFallback);
      }
    }

    //==================================================
    //==== FALLBACK
    //==================================================

    return this.resolve(undefined, undefined, defaultFallback);
  }

  //==================================================
  //==== TRANSLATE KEY
  //==================================================

  translateKey(key: string, fallback: string): string {
    const translated = this.translate.instant(key);

    if (
      typeof translated === 'string' &&
      translated.trim() &&
      translated !== key
    ) {
      return translated;
    }

    return fallback;
  }
}
