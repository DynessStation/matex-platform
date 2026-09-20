import { InjectionToken } from '@angular/core';

export interface SsrRequest {
  headers: {
    cookie?: string;
  };
}

export const SSR_REQUEST =
  new InjectionToken<SsrRequest>('SSR_REQUEST');