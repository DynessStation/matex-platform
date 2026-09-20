import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';

import {
  ApplicationConfig,
  mergeApplicationConfig,
} from '@angular/core';

import { provideServerRendering } from '@angular/ssr';

import { appConfig } from './app.config';

import {
  serverAuthInterceptor,
} from './core/interceptors/server-auth.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),

    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi(),
      withInterceptors([
        serverAuthInterceptor,
      ]),
    ),
  ],
};

export const config = mergeApplicationConfig(
  appConfig,
  serverConfig,
);